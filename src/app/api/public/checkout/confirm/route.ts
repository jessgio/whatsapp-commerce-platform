import { NextRequest, NextResponse } from "next/server";
import type { CheckoutAddress } from "@/lib/checkout-public";
import { loadCheckoutSession } from "@/lib/checkout-public";
import { isSupabaseConfigured } from "@/lib/env";
import { createPaymentLink } from "@/lib/integrations/payments";
import { getRates } from "@/lib/integrations/shipping";
import { consumeRateLimit, enforceRateLimit } from "@/lib/rate-limit";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

type ConfirmBody = {
  token?: string;
  name?: string;
  phone?: string;
  email?: string;
  address?: Partial<CheckoutAddress>;
  courier?: string;
  service?: string;
  shippingCost?: number;
};

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) return `+62${digits.slice(1)}`;
  if (digits.startsWith("62")) return `+${digits}`;
  if (phone.trim().startsWith("+")) return `+${digits}`;
  return digits ? `+${digits}` : "";
}

function validateAddress(
  address: Partial<CheckoutAddress> | undefined,
): CheckoutAddress | string {
  if (!address) return "Alamat pengiriman wajib diisi.";
  const recipientName = String(address.recipientName ?? "").trim();
  const recipientPhone = normalizePhone(String(address.recipientPhone ?? ""));
  const line1 = String(address.line1 ?? "").trim();
  const district = String(address.district ?? "").trim();
  const city = String(address.city ?? "").trim();
  const province = String(address.province ?? "").trim();
  const postalCode = String(address.postalCode ?? "").replace(/\D/g, "");

  if (recipientName.length < 2) return "Nama penerima wajib diisi.";
  if (recipientPhone.length < 8) return "Nomor telepon penerima tidak valid.";
  if (line1.length < 5) return "Alamat lengkap wajib diisi.";
  if (city.length < 2) return "Kota wajib diisi.";
  if (postalCode.length < 5) return "Kode pos tidak valid.";

  return {
    recipientName,
    recipientPhone,
    line1,
    district,
    city,
    province,
    postalCode,
  };
}

/** POST /api/public/checkout/confirm — save details, lock shipping, start Midtrans. */
export async function POST(req: NextRequest) {
  const limited = await enforceRateLimit(req, {
    scope: "checkout:confirm:ip",
    limit: 30,
    windowSeconds: 600,
  });
  if (limited) return limited;

  const body = (await req.json().catch(() => null)) as ConfirmBody | null;
  if (!body) {
    return NextResponse.json({ ok: false, error: "Body tidak valid." }, { status: 400 });
  }

  const token = String(body.token ?? "").trim();
  if (!token) {
    return NextResponse.json({ ok: false, error: "Token wajib." }, { status: 400 });
  }

  // Also cap per token: this books courier rates and creates payment links, and
  // a leaked link would otherwise be replayable from any number of addresses.
  const perToken = await consumeRateLimit(token, {
    scope: "checkout:confirm:token",
    limit: 15,
    windowSeconds: 600,
  });
  if (!perToken.allowed) {
    return NextResponse.json(
      { ok: false, error: "Terlalu banyak percobaan. Coba lagi sebentar." },
      { status: 429, headers: { "Retry-After": String(perToken.retryAfterSeconds) } },
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Checkout hanya tersedia saat mode live." },
      { status: 503 },
    );
  }

  const session = await loadCheckoutSession(token);
  if (!session) {
    return NextResponse.json(
      { ok: false, error: "Link checkout tidak valid." },
      { status: 404 },
    );
  }
  if (session.expired) {
    return NextResponse.json(
      { ok: false, error: "Link checkout sudah kedaluwarsa." },
      { status: 410 },
    );
  }
  if (session.alreadyPaid) {
    return NextResponse.json(
      {
        ok: true,
        alreadyPaid: true,
        paymentUrl: session.paymentLink,
      },
      { status: 200 },
    );
  }

  // If payment already pending with a link, allow resume.
  if (session.paymentStatus === "pending" && session.paymentLink) {
    return NextResponse.json({
      ok: true,
      paymentUrl: session.paymentLink,
      resumed: true,
    });
  }

  const name = String(body.name ?? "").trim() || session.customer.name;
  const phone = normalizePhone(String(body.phone ?? session.customer.phone));
  if (name.length < 2) {
    return NextResponse.json({ ok: false, error: "Nama wajib diisi." }, { status: 400 });
  }
  if (phone.length < 8) {
    return NextResponse.json(
      { ok: false, error: "Nomor telepon tidak valid." },
      { status: 400 },
    );
  }

  const addressOrError = validateAddress(body.address);
  if (typeof addressOrError === "string") {
    return NextResponse.json({ ok: false, error: addressOrError }, { status: 400 });
  }
  const address = addressOrError;

  const courier = String(body.courier ?? "").trim();
  const service = String(body.service ?? "").trim();
  if (!courier || !service) {
    return NextResponse.json(
      { ok: false, error: "Pilih kurir pengiriman." },
      { status: 400 },
    );
  }

  // Re-quote rates server-side so the client cannot understate shipping.
  const rates = await getRates({
    destinationPostalCode: address.postalCode,
    weightGrams: session.weightGrams,
    itemValue: session.subtotal,
  });
  const matched = rates.find((r) => r.courier === courier && r.service === service);
  if (!matched) {
    return NextResponse.json(
      { ok: false, error: "Tarif kurir tidak tersedia. Muat ulang daftar ongkir." },
      { status: 400 },
    );
  }

  const shippingCost = matched.cost;
  const total = session.subtotal + shippingCost;
  const supabase = createSupabaseAdminClient();
  const now = new Date().toISOString();

  await supabase
    .from("customers")
    .update({
      name,
      phone,
      city: address.city,
    })
    .eq("id", session.customer.id);

  // Upsert default address.
  const { data: existingAddr } = await supabase
    .from("addresses")
    .select("id")
    .eq("customer_id", session.customer.id)
    .eq("is_default", true)
    .maybeSingle();

  let addressId = existingAddr?.id as string | undefined;
  const addressRow = {
    customer_id: session.customer.id,
    label: "Rumah",
    recipient_name: address.recipientName,
    recipient_phone: address.recipientPhone,
    line1: address.line1,
    district: address.district,
    city: address.city,
    province: address.province,
    postal_code: address.postalCode,
    is_default: true,
  };

  if (addressId) {
    await supabase.from("addresses").update(addressRow).eq("id", addressId);
  } else {
    const { data: created } = await supabase
      .from("addresses")
      .insert(addressRow)
      .select("id")
      .single();
    addressId = created?.id;
  }

  const snapshot = {
    recipientName: address.recipientName,
    recipientPhone: address.recipientPhone,
    line1: address.line1,
    district: address.district,
    city: address.city,
    province: address.province,
    postalCode: address.postalCode,
  };

  const payment = await createPaymentLink({
    orderCode: session.code,
    amount: total,
    customerName: name,
    customerPhone: phone,
    customerEmail: session.customer.email,
  });

  if (!payment.ok || !payment.paymentUrl) {
    return NextResponse.json(
      {
        ok: false,
        error: payment.error ?? "Gagal membuat link pembayaran. Coba lagi.",
      },
      { status: 502 },
    );
  }

  await supabase
    .from("orders")
    .update({
      shipping_cost: shippingCost,
      total,
      shipping_address_id: addressId ?? null,
      shipping_address_snapshot: snapshot,
      courier,
      courier_service: service,
      payment_provider: payment.provider,
      payment_link: payment.paymentUrl,
      payment_status: "pending",
      updated_at: now,
    })
    .eq("id", session.orderId);

  await supabase.from("payments").insert({
    order_id: session.orderId,
    provider: payment.provider,
    reference: payment.reference ?? null,
    amount: total,
    status: "pending",
  });

  return NextResponse.json({
    ok: true,
    paymentUrl: payment.paymentUrl,
    total,
    shippingCost,
    mocked: Boolean(payment.mocked),
  });
}

import { NextRequest, NextResponse } from "next/server";
import { loadCheckoutSession } from "@/lib/checkout-public";
import { isSupabaseConfigured } from "@/lib/env";
import { getRates } from "@/lib/integrations/shipping";

/** POST /api/public/checkout/rates — Biteship (or demo) courier rates. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const token = String(body?.token ?? "").trim();
  const postalCode = String(body?.postalCode ?? "").replace(/\D/g, "");

  if (!token) {
    return NextResponse.json({ ok: false, error: "Token wajib." }, { status: 400 });
  }
  if (postalCode.length < 5) {
    return NextResponse.json(
      { ok: false, error: "Kode pos tujuan tidak valid." },
      { status: 400 },
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
      { ok: false, error: "Pesanan sudah dibayar." },
      { status: 409 },
    );
  }

  const rates = await getRates({
    destinationPostalCode: postalCode,
    weightGrams: session.weightGrams,
    itemValue: session.subtotal,
  });

  return NextResponse.json({ ok: true, rates });
}

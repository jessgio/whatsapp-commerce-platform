import "server-only";
import { cartWeightGrams } from "@/lib/checkout";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export type CheckoutAddress = {
  recipientName: string;
  recipientPhone: string;
  line1: string;
  district: string;
  city: string;
  province: string;
  postalCode: string;
};

export type CheckoutItemView = {
  sku: string;
  name: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
};

export type CheckoutSession = {
  token: string;
  orderId: string;
  code: string;
  status: string;
  paymentStatus: string;
  subtotal: number;
  shippingCost: number;
  total: number;
  items: CheckoutItemView[];
  weightGrams: number;
  customer: {
    id: string;
    name: string;
    phone: string;
    email: string | null;
  };
  savedAddress: CheckoutAddress | null;
  expired: boolean;
  alreadyPaid: boolean;
  paymentLink: string | null;
};

function mapAddress(row: Record<string, unknown> | null): CheckoutAddress | null {
  if (!row) return null;
  const name = String(row.recipient_name ?? "").trim();
  const phone = String(row.recipient_phone ?? "").trim();
  const line1 = String(row.line1 ?? "").trim();
  const city = String(row.city ?? "").trim();
  const postalCode = String(row.postal_code ?? "").trim();
  if (!name && !line1 && !postalCode) return null;
  return {
    recipientName: name,
    recipientPhone: phone,
    line1,
    district: String(row.district ?? ""),
    city,
    province: String(row.province ?? ""),
    postalCode,
  };
}

export async function loadCheckoutSession(
  token: string,
): Promise<CheckoutSession | null> {
  if (!token || !isSupabaseConfigured()) return null;

  const supabase = createSupabaseAdminClient();
  const { data: order } = await supabase
    .from("orders")
    .select(
      "id, code, status, payment_status, payment_link, subtotal, shipping_cost, total, checkout_expires_at, customer_id, customers!orders_customer_id_fkey(id, name, phone, email)",
    )
    .eq("checkout_token", token)
    .maybeSingle();

  if (!order) return null;

  const { data: items } = await supabase
    .from("order_items")
    .select("sku, name, qty, unit_price")
    .eq("order_id", order.id);

  const lineItems: CheckoutItemView[] = (items ?? []).map((it) => ({
    sku: String(it.sku ?? ""),
    name: String(it.name ?? it.sku ?? "Item"),
    qty: Number(it.qty ?? 0),
    unitPrice: Number(it.unit_price ?? 0),
    lineTotal: Number(it.qty ?? 0) * Number(it.unit_price ?? 0),
  }));

  const customerRow = Array.isArray(order.customers)
    ? order.customers[0]
    : order.customers;
  const customer = customerRow as {
    id: string;
    name: string;
    phone: string;
    email: string | null;
  } | null;

  if (!customer) return null;

  const { data: addresses } = await supabase
    .from("addresses")
    .select("*")
    .eq("customer_id", customer.id)
    .order("is_default", { ascending: false })
    .limit(1);

  const savedAddress = mapAddress(
    (addresses?.[0] as Record<string, unknown> | undefined) ?? null,
  );

  const expiresAt = order.checkout_expires_at
    ? new Date(order.checkout_expires_at as string).getTime()
    : null;
  const expired = Boolean(expiresAt && expiresAt < Date.now());
  const alreadyPaid =
    order.payment_status === "paid" || order.status === "paid";

  return {
    token,
    orderId: order.id as string,
    code: order.code as string,
    status: order.status as string,
    paymentStatus: order.payment_status as string,
    subtotal: Number(order.subtotal ?? 0),
    shippingCost: Number(order.shipping_cost ?? 0),
    total: Number(order.total ?? 0),
    items: lineItems,
    weightGrams: cartWeightGrams(lineItems),
    customer: {
      id: customer.id,
      name: customer.name ?? "",
      phone: customer.phone ?? "",
      email: customer.email ?? null,
    },
    savedAddress,
    expired,
    alreadyPaid,
    paymentLink: (order.payment_link as string | null) ?? null,
  };
}

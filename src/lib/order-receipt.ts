import "server-only";
import { formatIDR } from "@/lib/format";
import { sendText } from "@/lib/integrations/whatsapp";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

/** Send a short WhatsApp receipt after successful payment and log it in inbox. */
export async function sendOrderPaidReceipt(
  supabase: AdminClient,
  orderCode: string,
): Promise<void> {
  const { data: order } = await supabase
    .from("orders")
    .select(
      "id, code, subtotal, shipping_cost, total, courier, courier_service, shipping_address_snapshot, customer_id, customers!orders_customer_id_fkey(wa_id, name)",
    )
    .eq("code", orderCode)
    .maybeSingle();

  if (!order) return;

  const customer = Array.isArray(order.customers)
    ? order.customers[0]
    : order.customers;
  const waId = (customer as { wa_id?: string } | null)?.wa_id;
  if (!waId) return;

  const { data: items } = await supabase
    .from("order_items")
    .select("name, qty, unit_price")
    .eq("order_id", order.id);

  const itemLines = (items ?? [])
    .map((it) => {
      const line = Number(it.qty ?? 0) * Number(it.unit_price ?? 0);
      return `• ${it.name} x${it.qty} — ${formatIDR(line)}`;
    })
    .join("\n");

  const snap = (order.shipping_address_snapshot ?? {}) as Record<string, string>;
  const addressLine = [
    snap.line1,
    snap.district,
    snap.city,
    snap.province,
    snap.postalCode,
  ]
    .filter(Boolean)
    .join(", ");

  const courierBits = [order.courier, order.courier_service]
    .filter(Boolean)
    .join(" ");

  const body = [
    `Pembayaran berhasil ✅`,
    `Struk pesanan *${order.code}*`,
    "",
    itemLines || "(item)",
    "",
    `Subtotal: ${formatIDR(Number(order.subtotal ?? 0))}`,
    `Ongkir${courierBits ? ` (${courierBits})` : ""}: ${formatIDR(Number(order.shipping_cost ?? 0))}`,
    `Total: ${formatIDR(Number(order.total ?? 0))}`,
    addressLine ? `\nDikirim ke:\n${snap.recipientName ?? ""}\n${addressLine}` : "",
    "",
    "Terima kasih sudah belanja di Aeris Beauté. Pesanan Anda sedang kami proses.",
  ]
    .filter((line) => line !== "")
    .join("\n");

  const sent = await sendText(waId, body);

  const { data: conv } = await supabase
    .from("conversations")
    .select("id")
    .eq("customer_id", order.customer_id)
    .maybeSingle();

  if (conv) {
    const now = new Date().toISOString();
    await supabase.from("messages").insert({
      conversation_id: conv.id,
      direction: "out",
      kind: "order",
      body,
      author_name: "System",
      status: sent.ok ? "sent" : "failed",
      wa_message_id: sent.messageId ?? null,
      created_at: now,
    });
    await supabase
      .from("conversations")
      .update({
        last_message_preview: `Struk ${order.code}`,
        last_message_at: now,
      })
      .eq("id", conv.id);
  }
}

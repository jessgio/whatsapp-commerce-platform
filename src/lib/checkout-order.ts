import "server-only";
import {
  checkoutExpiresAt,
  checkoutUrl,
  newCheckoutToken,
  newOrderCode,
  parseWhatsAppOrder,
} from "@/lib/checkout";
import { formatIDR } from "@/lib/format";
import { sendText } from "@/lib/integrations/whatsapp";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

/**
 * Create a draft WhatsApp-cart order from an inbound order message and send
 * the customer a hosted checkout link. Idempotent on wa_message_id.
 */
export async function createCartOrderFromInbound(input: {
  supabase: AdminClient;
  customerId: string;
  conversationId: string;
  waId: string;
  raw: unknown;
  waMessageId: string | null;
  timestamp: string;
}): Promise<{ orderId: string; code: string; checkoutUrl: string } | null> {
  const parsed = parseWhatsAppOrder(input.raw);
  if (!parsed) return null;

  // Claim idempotency key first so concurrent webhook retries don't double-create.
  const eventId = input.waMessageId ? `wa-order:${input.waMessageId}` : null;
  if (eventId) {
    const { error: claimErr } = await input.supabase.from("webhook_events").insert({
      id: eventId,
      source: "whatsapp",
      payload: { type: "order", wa_message_id: input.waMessageId, status: "creating" },
    });
    if (claimErr) {
      // Only a unique violation means "already handled". Treating every error as
      // a duplicate silently dropped real orders on transient database failures.
      if (claimErr.code !== "23505") {
        console.error("[checkout] idempotency claim failed", claimErr);
      }
      return null;
    }
  }

  const skus = [...new Set(parsed.items.map((i) => i.retailerId))];
  const { data: products, error: productsErr } = await input.supabase
    .from("products")
    .select("id, sku, name, retail_price, discount_percent")
    .in("sku", skus);
  if (productsErr) {
    // Falling back to cart prices here would bypass catalog discounts, so bail
    // and let the webhook retry rather than quote the customer a wrong total.
    console.error("[checkout] catalog lookup failed", productsErr);
    if (eventId) {
      await input.supabase.from("webhook_events").delete().eq("id", eventId);
    }
    return null;
  }

  const bySku = new Map((products ?? []).map((p) => [p.sku as string, p]));

  const lineItems: {
    product_id: string | null;
    sku: string;
    name: string;
    qty: number;
    unit_price: number;
  }[] = [];

  for (const item of parsed.items) {
    const product = bySku.get(item.retailerId);
    const discount = Number(product?.discount_percent ?? 0);
    const catalogPrice = product
      ? Math.round(
          Number(product.retail_price) * (1 - Math.min(100, discount) / 100),
        )
      : Math.round(item.itemPrice);
    const unitPrice =
      item.itemPrice > 0 ? Math.round(item.itemPrice) : catalogPrice;
    lineItems.push({
      product_id: product?.id ?? null,
      sku: item.retailerId,
      name: (product?.name as string) ?? item.retailerId,
      qty: item.quantity,
      unit_price: unitPrice,
    });
  }

  if (lineItems.length === 0) {
    if (eventId) {
      await input.supabase.from("webhook_events").delete().eq("id", eventId);
    }
    return null;
  }

  const subtotal = lineItems.reduce((s, it) => s + it.unit_price * it.qty, 0);
  const token = newCheckoutToken();
  const code = newOrderCode();
  const expiresAt = checkoutExpiresAt();

  const { data: order, error: orderErr } = await input.supabase
    .from("orders")
    .insert({
      code,
      customer_id: input.customerId,
      status: "new",
      payment_status: "unpaid",
      channel: "whatsapp_cart",
      subtotal,
      shipping_cost: 0,
      total: subtotal,
      checkout_token: token,
      checkout_expires_at: expiresAt,
      created_at: input.timestamp,
      updated_at: input.timestamp,
    })
    .select("id, code")
    .single();

  if (orderErr || !order) {
    console.error("[checkout] create order failed", orderErr);
    if (eventId) {
      await input.supabase.from("webhook_events").delete().eq("id", eventId);
    }
    return null;
  }

  const { error: itemsErr } = await input.supabase.from("order_items").insert(
    lineItems.map((it) => ({
      order_id: order.id,
      product_id: it.product_id,
      sku: it.sku,
      name: it.name,
      qty: it.qty,
      unit_price: it.unit_price,
    })),
  );
  if (itemsErr) {
    // An order with a total but no line items would still have been sent to the
    // customer as a payable checkout link. Undo it and let the retry rebuild it.
    console.error("[checkout] create order_items failed", itemsErr);
    await input.supabase.from("orders").delete().eq("id", order.id);
    if (eventId) {
      await input.supabase.from("webhook_events").delete().eq("id", eventId);
    }
    return null;
  }

  if (eventId) {
    await input.supabase
      .from("webhook_events")
      .update({
        payload: {
          type: "order",
          wa_message_id: input.waMessageId,
          order_id: order.id,
          order_code: order.code,
          status: "created",
        },
      })
      .eq("id", eventId);
  }

  const link = checkoutUrl(token);
  const itemLines = lineItems
    .map((it) => `• ${it.name} x${it.qty} — ${formatIDR(it.unit_price * it.qty)}`)
    .join("\n");
  const body = [
    `Terima kasih! Pesanan *${code}* sudah kami terima.`,
    "",
    itemLines,
    `Subtotal: ${formatIDR(subtotal)}`,
    "",
    "Lanjutkan checkout (alamat + ongkir + pembayaran) di sini:",
    link,
    "",
    "Link berlaku 24 jam.",
  ].join("\n");

  const sent = await sendText(input.waId, body);

  await input.supabase.from("messages").insert({
    conversation_id: input.conversationId,
    direction: "out",
    kind: "order",
    body,
    author_name: "System",
    status: sent.ok ? "sent" : "failed",
    wa_message_id: sent.messageId ?? null,
    created_at: new Date().toISOString(),
  });

  await input.supabase
    .from("conversations")
    .update({
      last_message_preview: `Checkout link: ${code}`,
      last_message_at: new Date().toISOString(),
    })
    .eq("id", input.conversationId);

  return { orderId: order.id, code: order.code, checkoutUrl: link };
}

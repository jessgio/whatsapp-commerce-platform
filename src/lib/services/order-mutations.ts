import "server-only";
import { revalidatePath } from "next/cache";
import { getCustomer, getOrder } from "@/lib/data/repo";
import { shouldUseSupabaseData } from "@/lib/data/mode";
import { createPaymentLink } from "@/lib/integrations/payments";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { DEMO_NOTICES, DEMO_ORDERS } from "@/lib/demo/data";
import type { OrderStatus } from "@/lib/types";

const FLOW: OrderStatus[] = ["new", "paid", "allocated", "packed", "shipped", "delivered"];

export async function generateOrderPaymentLink(
  orderId: string,
): Promise<{ ok: boolean; error?: string; paymentUrl?: string }> {
  const order = await getOrder(orderId);
  if (!order) return { ok: false, error: "Order not found." };
  const customer = await getCustomer(order.customerId);

  const result = await createPaymentLink({
    orderCode: order.code,
    amount: order.total,
    customerName: order.customerName,
    customerPhone: customer?.phone ?? "",
    customerEmail: customer?.email,
  });

  if (!result.ok || !result.paymentUrl) {
    return { ok: false, error: "Could not create payment link." };
  }

  if (shouldUseSupabaseData()) {
    const supabase = createSupabaseAdminClient();
    const now = new Date().toISOString();
    await supabase
      .from("orders")
      .update({
        payment_link: result.paymentUrl,
        payment_provider: result.provider,
        payment_status: "pending",
        updated_at: now,
      })
      .eq("id", orderId);

    await supabase.from("payments").insert({
      order_id: orderId,
      provider: result.provider,
      reference: result.reference ?? null,
      amount: order.total,
      status: "pending",
    });
  } else {
    const o = DEMO_ORDERS.find((x) => x.id === orderId);
    if (o) {
      o.paymentLink = result.paymentUrl ?? null;
      o.paymentProvider = result.provider;
      o.paymentStatus = "pending";
    }
  }

  revalidatePath(`/orders/${orderId}`);
  return { ok: true, paymentUrl: result.paymentUrl };
}

export async function advanceOrderStatus(
  orderId: string,
): Promise<{ ok: boolean; error?: string; status?: OrderStatus }> {
  if (shouldUseSupabaseData()) {
    const order = await getOrder(orderId);
    if (!order) return { ok: false, error: "Order not found." };
    const idx = FLOW.indexOf(order.status);
    if (idx < 0 || idx >= FLOW.length - 1) {
      return { ok: false, error: "Order cannot be advanced." };
    }
    const next = FLOW[idx + 1];
    const supabase = createSupabaseAdminClient();
    await supabase
      .from("orders")
      .update({
        status: next,
        ...(next === "paid" ? { payment_status: "paid" } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);
    revalidatePath(`/orders/${orderId}`);
    revalidatePath("/orders");
    return { ok: true, status: next };
  }

  const o = DEMO_ORDERS.find((x) => x.id === orderId);
  if (!o) return { ok: false, error: "Order not found." };
  const idx = FLOW.indexOf(o.status);
  if (idx < 0 || idx >= FLOW.length - 1) {
    return { ok: false, error: "Order cannot be advanced." };
  }
  o.status = FLOW[idx + 1];
  if (o.status === "paid") o.paymentStatus = "paid";
  o.updatedAt = new Date().toISOString();
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");
  return { ok: true, status: o.status };
}

export async function raiseOrderWarehouseNotice(
  orderId: string,
  message: string,
  raisedByName: string,
): Promise<{ ok: boolean; error?: string }> {
  const trimmed = message.trim();
  if (!trimmed) return { ok: false, error: "Message is required." };

  if (shouldUseSupabaseData()) {
    const order = await getOrder(orderId);
    if (!order) return { ok: false, error: "Order not found." };
    const supabase = createSupabaseAdminClient();
    await supabase
      .from("orders")
      .update({
        flagged_issue: trimmed,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);
    // warehouse_notices table may not always be writable the same way in every env;
    // flag on the order is the primary signal used by the portal UI.
    revalidatePath(`/orders/${orderId}`);
    revalidatePath("/warehouse");
    return { ok: true };
  }

  const o = DEMO_ORDERS.find((x) => x.id === orderId);
  if (!o) return { ok: false, error: "Order not found." };
  o.flaggedIssue = trimmed;
  DEMO_NOTICES.unshift({
    id: `wn-${Date.now()}`,
    orderId: o.id,
    orderCode: o.code,
    raisedByName,
    type: "other",
    message: trimmed,
    status: "open",
    createdAt: new Date().toISOString(),
  });
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/warehouse");
  return { ok: true };
}

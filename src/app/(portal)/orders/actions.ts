"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/guard";
import { isSupabaseConfigured } from "@/lib/env";
import { getCustomer, getOrder } from "@/lib/data/repo";
import { createPaymentLink } from "@/lib/integrations/payments";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { DEMO_NOTICES, DEMO_ORDERS } from "@/lib/demo/data";
import type { OrderStatus } from "@/lib/types";

const FLOW: OrderStatus[] = ["new", "paid", "allocated", "packed", "shipped", "delivered"];

export async function generatePaymentLink(orderId: string) {
  await requirePermission("orders.edit");
  const order = await getOrder(orderId);
  if (!order) return;
  const customer = await getCustomer(order.customerId);

  const result = await createPaymentLink({
    orderCode: order.code,
    amount: order.total,
    customerName: order.customerName,
    customerPhone: customer?.phone ?? "",
    customerEmail: customer?.email,
  });

  if (!result.ok || !result.paymentUrl) return;

  if (isSupabaseConfigured()) {
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
}

export async function advanceStatus(orderId: string) {
  await requirePermission("orders.edit");
  if (isSupabaseConfigured()) {
    const order = await getOrder(orderId);
    if (!order) return;
    const idx = FLOW.indexOf(order.status);
    if (idx < 0 || idx >= FLOW.length - 1) return;
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
    return;
  }
  const o = DEMO_ORDERS.find((x) => x.id === orderId);
  if (!o) return;
  const idx = FLOW.indexOf(o.status);
  if (idx >= 0 && idx < FLOW.length - 1) {
    o.status = FLOW[idx + 1];
    if (o.status === "paid") o.paymentStatus = "paid";
    o.updatedAt = new Date().toISOString();
  }
  revalidatePath(`/orders/${orderId}`);
}

export async function raiseWarehouseNotice(orderId: string, formData: FormData) {
  await requirePermission("orders.edit");
  const message = String(formData.get("message") ?? "").trim();
  if (!message) return;
  const o = DEMO_ORDERS.find((x) => x.id === orderId);
  if (o && !isSupabaseConfigured()) {
    o.flaggedIssue = message;
    DEMO_NOTICES.unshift({
      id: `wn-${Date.now()}`,
      orderId: o.id,
      orderCode: o.code,
      raisedByName: "You",
      type: "other",
      message,
      status: "open",
      createdAt: new Date().toISOString(),
    });
  }
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/warehouse");
}

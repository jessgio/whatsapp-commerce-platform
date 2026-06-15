"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/guard";
import { isSupabaseConfigured } from "@/lib/env";
import { getCustomer, getOrder } from "@/lib/data/repo";
import { createPaymentLink } from "@/lib/integrations/payments";
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

  if (result.ok && !isSupabaseConfigured()) {
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
  if (isSupabaseConfigured()) return;
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

"use server";

import { requirePermission } from "@/lib/guard";
import {
  advanceOrderStatus,
  generateOrderPaymentLink,
  raiseOrderWarehouseNotice,
} from "@/lib/services/order-mutations";

export async function generatePaymentLink(orderId: string) {
  await requirePermission("orders.edit");
  await generateOrderPaymentLink(orderId);
}

export async function advanceStatus(orderId: string) {
  await requirePermission("orders.edit");
  await advanceOrderStatus(orderId);
}

export async function raiseWarehouseNotice(orderId: string, formData: FormData) {
  const user = await requirePermission("orders.edit");
  const message = String(formData.get("message") ?? "");
  await raiseOrderWarehouseNotice(orderId, message, user.name);
}

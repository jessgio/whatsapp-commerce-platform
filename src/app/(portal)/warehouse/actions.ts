"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/guard";
import { isSupabaseConfigured } from "@/lib/env";
import { createShipment } from "@/lib/integrations/shipping";
import { DEMO_NOTICES, DEMO_ORDERS, DEMO_PRODUCTS, DEMO_SHIPMENTS } from "@/lib/demo/data";
import type { WarehouseNotice } from "@/lib/types";

/**
 * Generates a shipping label for an order: books a 3PL shipment to obtain an
 * AWB/tracking number, affixes it as the scannable label number, and moves the
 * order to "allocated" so it surfaces in the pack station.
 */
export async function generateLabel(orderId: string) {
  await requirePermission("warehouse.edit");
  if (isSupabaseConfigured()) {
    // Live mode would persist via Supabase + Biteship; demo mutates in-memory.
    revalidatePath("/warehouse");
    return;
  }
  const o = DEMO_ORDERS.find((x) => x.id === orderId);
  if (!o || o.labelNumber) {
    revalidatePath("/warehouse");
    return;
  }
  const courier = "SiCepat";
  const service = "REG";
  const result = await createShipment({
    orderCode: o.code,
    courier,
    service,
    recipientName: o.shippingAddress?.recipientName ?? o.customerName,
    recipientPhone: "",
    destinationAddress: o.shippingAddress?.line1 ?? "",
    destinationPostalCode: o.shippingAddress?.postalCode ?? "",
  });
  if (result.ok && result.trackingNumber) {
    o.labelNumber = result.trackingNumber;
    o.courier = courier;
    if (o.status === "paid") o.status = "allocated";
    o.updatedAt = new Date().toISOString();
    DEMO_SHIPMENTS.unshift({
      id: `s-${Date.now()}`,
      orderId: o.id,
      orderCode: o.code,
      customerName: o.customerName,
      courier,
      service,
      trackingNumber: result.trackingNumber,
      status: "requested",
      cost: o.shippingCost,
      destinationCity: o.shippingAddress?.city ?? "Jakarta",
      events: [{ status: "Pengiriman dibuat", note: "Label generated, awaiting pack", at: new Date().toISOString() }],
      createdAt: new Date().toISOString(),
    });
  }
  revalidatePath("/warehouse");
}

export async function setNoticeStatus(noticeId: string, status: WarehouseNotice["status"]) {
  await requirePermission("warehouse.edit");
  if (!isSupabaseConfigured()) {
    const n = DEMO_NOTICES.find((x) => x.id === noticeId);
    if (n) n.status = status;
  }
  revalidatePath("/warehouse");
}

export async function receiveStock(formData: FormData) {
  await requirePermission("warehouse.edit");
  const productId = String(formData.get("productId") ?? "");
  const qty = Number(formData.get("qty") ?? 0);
  if (!productId || qty <= 0) return;
  if (!isSupabaseConfigured()) {
    const p = DEMO_PRODUCTS.find((x) => x.id === productId);
    if (p) {
      p.stock += qty;
      p.catalogSync = "pending";
    }
  }
  revalidatePath("/warehouse");
  revalidatePath("/catalog");
}

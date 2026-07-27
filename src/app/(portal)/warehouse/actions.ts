"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/guard";
import { shouldUseSupabaseData } from "@/lib/data/mode";
import { getCustomerAddresses, getOrder } from "@/lib/data/repo";
import { createShipment } from "@/lib/integrations/shipping";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DEMO_NOTICES, DEMO_ORDERS, DEMO_PRODUCTS, DEMO_SHIPMENTS } from "@/lib/demo/data";
import type { Order, WarehouseNotice } from "@/lib/types";

export type ActionResult = { ok: true } | { ok: false; error: string };

const COURIER = "SiCepat";
const SERVICE = "REG";

/**
 * Generates a shipping label for an order: books a 3PL shipment to obtain an
 * AWB/tracking number, affixes it as the scannable label number, and moves the
 * order to "allocated" so it surfaces in the pack station.
 */
export async function generateLabel(orderId: string): Promise<ActionResult> {
  await requirePermission("warehouse.edit");

  const order = await getOrder(orderId);
  if (!order) return { ok: false, error: "Order not found." };
  if (order.labelNumber) {
    revalidatePath("/warehouse");
    return { ok: true };
  }

  const recipientPhone = await lookupRecipientPhone(order);
  const result = await createShipment({
    orderCode: order.code,
    courier: COURIER,
    service: SERVICE,
    recipientName: order.shippingAddress?.recipientName ?? order.customerName,
    recipientPhone,
    destinationAddress: order.shippingAddress?.line1 ?? "",
    destinationPostalCode: order.shippingAddress?.postalCode ?? "",
  });

  if (!result.ok || !result.trackingNumber) {
    return { ok: false, error: result.error ?? "The courier did not return a tracking number." };
  }

  const now = new Date().toISOString();

  if (shouldUseSupabaseData()) {
    const supabase = await createSupabaseServerClient();
    const { error: orderErr } = await supabase
      .from("orders")
      .update({
        label_number: result.trackingNumber,
        courier: COURIER,
        tracking_number: result.trackingNumber,
        ...(order.status === "paid" ? { status: "allocated" } : {}),
        updated_at: now,
      })
      .eq("id", order.id);
    if (orderErr) {
      console.error("[warehouse] affix label failed", orderErr);
      return { ok: false, error: "Label was booked but could not be saved. Try again." };
    }

    const { data: shipment, error: shipmentErr } = await supabase
      .from("shipments")
      .insert({
        order_id: order.id,
        biteship_order_id: result.biteshipOrderId ?? null,
        courier: COURIER,
        service: SERVICE,
        tracking_number: result.trackingNumber,
        status: "requested",
        cost: order.shippingCost,
        destination_city: order.shippingAddress?.city ?? "",
      })
      .select("id")
      .single();
    if (shipmentErr || !shipment) {
      console.error("[warehouse] create shipment row failed", shipmentErr);
    } else {
      const { error: eventErr } = await supabase.from("shipment_events").insert({
        shipment_id: shipment.id,
        status: "Pengiriman dibuat",
        note: "Label generated, awaiting pack",
        at: now,
      });
      if (eventErr) console.error("[warehouse] create shipment event failed", eventErr);
    }
  } else {
    const o = DEMO_ORDERS.find((x) => x.id === orderId);
    if (o) {
      o.labelNumber = result.trackingNumber;
      o.courier = COURIER;
      if (o.status === "paid") o.status = "allocated";
      o.updatedAt = now;
      DEMO_SHIPMENTS.unshift({
        id: `s-${Date.now()}`,
        orderId: o.id,
        orderCode: o.code,
        customerName: o.customerName,
        courier: COURIER,
        service: SERVICE,
        trackingNumber: result.trackingNumber,
        status: "requested",
        cost: o.shippingCost,
        destinationCity: o.shippingAddress?.city ?? "Jakarta",
        events: [
          { status: "Pengiriman dibuat", note: "Label generated, awaiting pack", at: now },
        ],
        createdAt: now,
      });
    }
  }

  revalidatePath("/warehouse");
  revalidatePath("/shipments");
  revalidatePath(`/orders/${order.id}`);
  return { ok: true };
}

/** Biteship rejects bookings without a destination phone, so fall back to the customer's. */
async function lookupRecipientPhone(order: Order): Promise<string> {
  const addresses = await getCustomerAddresses(order.customerId);
  const preferred =
    addresses.find((a) => a.isDefault && a.recipientPhone) ??
    addresses.find((a) => a.recipientPhone);
  return preferred?.recipientPhone ?? "";
}

export async function setNoticeStatus(
  noticeId: string,
  status: WarehouseNotice["status"],
): Promise<ActionResult> {
  await requirePermission("warehouse.edit");

  if (shouldUseSupabaseData()) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("warehouse_notices")
      .update({ status })
      .eq("id", noticeId);
    if (error) {
      console.error("[warehouse] update notice status failed", error);
      return { ok: false, error: "Could not update the notice. Try again." };
    }
  } else {
    const n = DEMO_NOTICES.find((x) => x.id === noticeId);
    if (!n) return { ok: false, error: "Notice not found." };
    n.status = status;
  }

  revalidatePath("/warehouse");
  return { ok: true };
}

export async function receiveStock(formData: FormData): Promise<ActionResult> {
  await requirePermission("warehouse.edit");
  const productId = String(formData.get("productId") ?? "");
  const qty = Number(formData.get("qty") ?? 0);
  if (!productId) return { ok: false, error: "Select a product." };
  if (!Number.isFinite(qty) || qty <= 0) return { ok: false, error: "Enter a quantity above zero." };

  if (shouldUseSupabaseData()) {
    const supabase = await createSupabaseServerClient();
    const { data: product, error: readErr } = await supabase
      .from("products")
      .select("stock")
      .eq("id", productId)
      .maybeSingle();
    if (readErr || !product) {
      console.error("[warehouse] receive stock lookup failed", readErr);
      return { ok: false, error: "Product not found." };
    }

    // Compare-and-set on the stock we read so two concurrent receipts cannot
    // both write the same total and lose one delivery.
    const { data: updated, error: updateErr } = await supabase
      .from("products")
      .update({ stock: product.stock + qty, catalog_sync: "pending" })
      .eq("id", productId)
      .eq("stock", product.stock)
      .select("id")
      .maybeSingle();
    if (updateErr) {
      console.error("[warehouse] receive stock failed", updateErr);
      return { ok: false, error: "Could not record the stock receipt. Try again." };
    }
    if (!updated) {
      return { ok: false, error: "Stock changed while you were submitting. Try again." };
    }

    const { error: movementErr } = await supabase.from("inventory_movements").insert({
      product_id: productId,
      delta: qty,
      reason: "receive",
    });
    if (movementErr) console.error("[warehouse] log inventory movement failed", movementErr);
  } else {
    const p = DEMO_PRODUCTS.find((x) => x.id === productId);
    if (!p) return { ok: false, error: "Product not found." };
    p.stock += qty;
    p.catalogSync = "pending";
  }

  revalidatePath("/warehouse");
  revalidatePath("/catalog");
  return { ok: true };
}

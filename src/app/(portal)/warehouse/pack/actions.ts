"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/guard";
import { findOrderByLabel, getProductBarcode } from "@/lib/data/repo";
import { DEMO_ORDERS, DEMO_PACK_SESSIONS } from "@/lib/demo/data";
import type { PackProgressItem, PackSession } from "@/lib/types";

export type PackResult =
  | { ok: true; session: PackSession }
  | { ok: false; error: string };

function clone(s: PackSession): PackSession {
  return JSON.parse(JSON.stringify(s));
}

/** Resolve a scanned label/AWB to an order and open (or resume) a pack session. */
export async function startPackSession(labelNumber: string): Promise<PackResult> {
  const user = await requirePermission("warehouse.edit");
  const label = labelNumber.trim();
  if (!label) return { ok: false, error: "Scan or enter a label number." };

  const order = await findOrderByLabel(label);
  if (!order) return { ok: false, error: `No order found for label "${label}".` };
  if (!["paid", "allocated", "packed"].includes(order.status)) {
    return { ok: false, error: `Order ${order.code} is not ready to pack (status: ${order.status}).` };
  }

  const existing = DEMO_PACK_SESSIONS.find(
    (s) => s.orderId === order.id && s.status === "in_progress",
  );
  if (existing) return { ok: true, session: clone(existing) };

  const items: PackProgressItem[] = [];
  for (const it of order.items) {
    items.push({
      productId: it.productId,
      sku: it.sku,
      barcode: await getProductBarcode(it.productId),
      name: it.name,
      required: it.qty,
      scanned: 0,
    });
  }

  const session: PackSession = {
    id: `pack-${Date.now()}`,
    orderId: order.id,
    orderCode: order.code,
    labelNumber: order.labelNumber ?? order.code,
    packerId: user.id,
    packerName: user.name,
    status: "in_progress",
    startedAt: new Date().toISOString(),
    completedAt: null,
    items,
    scans: [],
  };
  DEMO_PACK_SESSIONS.push(session);
  return { ok: true, session: clone(session) };
}

/**
 * Scan one product barcode. Enforces sequential picking: only the current
 * unfinished line accepts scans. Every scan is timestamped + attributed.
 */
export async function scanItem(sessionId: string, barcode: string): Promise<PackResult> {
  await requirePermission("warehouse.edit");
  const code = barcode.trim();
  const session = DEMO_PACK_SESSIONS.find((s) => s.id === sessionId);
  if (!session) return { ok: false, error: "Pack session not found." };
  if (session.status === "completed") return { ok: false, error: "Session already completed." };
  if (!code) return { ok: false, error: "Empty scan." };

  const current = session.items.find((i) => i.scanned < i.required);
  if (!current) return { ok: false, error: "All items already scanned." };

  const matchesCurrent = code === current.barcode || code === current.sku;
  if (!matchesCurrent) {
    const other = session.items.find((i) => i.barcode === code || i.sku === code);
    if (other) {
      return {
        ok: false,
        error: `Finish "${current.name}" (${current.scanned}/${current.required}) before scanning ${other.name}.`,
      };
    }
    return { ok: false, error: `Unknown barcode "${code}" — not part of this order.` };
  }

  current.scanned += 1;
  session.scans.push({ sku: current.sku, name: current.name, at: new Date().toISOString() });
  return { ok: true, session: clone(session) };
}

/** Complete a fully-scanned session and mark the order packed. */
export async function completePackSession(sessionId: string): Promise<PackResult> {
  await requirePermission("warehouse.edit");
  const session = DEMO_PACK_SESSIONS.find((s) => s.id === sessionId);
  if (!session) return { ok: false, error: "Pack session not found." };

  const incomplete = session.items.some((i) => i.scanned < i.required);
  if (incomplete) return { ok: false, error: "Not all items have been scanned." };

  session.status = "completed";
  session.completedAt = new Date().toISOString();

  const order = DEMO_ORDERS.find((o) => o.id === session.orderId);
  if (order && order.status !== "shipped" && order.status !== "delivered") {
    order.status = "packed";
    order.updatedAt = new Date().toISOString();
  }

  revalidatePath("/warehouse");
  return { ok: true, session: clone(session) };
}

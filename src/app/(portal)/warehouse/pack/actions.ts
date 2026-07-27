"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/guard";
import { shouldUseSupabaseData } from "@/lib/data/mode";
import { findOrderByLabel, getPackSession, getProductBarcodes } from "@/lib/data/repo";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DEMO_ORDERS, DEMO_PACK_SESSIONS } from "@/lib/demo/data";
import type { AppUser, Order, PackProgressItem, PackSession } from "@/lib/types";

export type PackResult =
  | { ok: true; session: PackSession }
  | { ok: false; error: string };

function clone(s: PackSession): PackSession {
  return JSON.parse(JSON.stringify(s));
}

/**
 * One checklist line per SKU. Orders can carry the same SKU on several lines,
 * and scans are matched by SKU, so the counts have to be merged up front or a
 * scan would be ambiguous between two identical lines.
 */
async function buildChecklist(order: Order): Promise<PackProgressItem[]> {
  const barcodes = await getProductBarcodes(order.items.map((it) => it.productId));
  const bySku = new Map<string, PackProgressItem>();

  for (const it of order.items) {
    const existing = bySku.get(it.sku);
    if (existing) {
      existing.required += it.qty;
      continue;
    }
    bySku.set(it.sku, {
      productId: it.productId,
      sku: it.sku,
      barcode: barcodes.get(it.productId) ?? it.sku,
      name: it.name,
      required: it.qty,
      scanned: 0,
    });
  }

  return [...bySku.values()];
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

  return shouldUseSupabaseData()
    ? startLiveSession(order, user)
    : startDemoSession(order, user);
}

async function startLiveSession(order: Order, user: AppUser): Promise<PackResult> {
  const supabase = await createSupabaseServerClient();

  const { data: existing, error: existingErr } = await supabase
    .from("pack_sessions")
    .select("id")
    .eq("order_id", order.id)
    .eq("status", "in_progress")
    .maybeSingle();
  if (existingErr) {
    console.error("[pack] lookup existing session failed", existingErr);
    return { ok: false, error: "Could not open a pack session. Try again." };
  }
  if (existing) {
    const resumed = await getPackSession(existing.id);
    if (resumed) return { ok: true, session: resumed };
  }

  const { data: created, error: createErr } = await supabase
    .from("pack_sessions")
    .insert({
      order_id: order.id,
      label_number: order.labelNumber ?? order.code,
      packer_id: user.id,
      status: "in_progress",
    })
    .select("id")
    .single();
  if (createErr || !created) {
    console.error("[pack] create session failed", createErr);
    return { ok: false, error: "Could not open a pack session. Try again." };
  }

  const checklist = await buildChecklist(order);
  const { error: itemsErr } = await supabase.from("pack_session_items").insert(
    checklist.map((it) => ({
      session_id: created.id,
      product_id: it.productId || null,
      sku: it.sku,
      barcode: it.barcode,
      name: it.name,
      required: it.required,
      scanned: 0,
    })),
  );
  if (itemsErr) {
    // A session with no checklist would let a packer "complete" an unpacked
    // order, so roll it back rather than leaving a half-built session behind.
    console.error("[pack] create session items failed", itemsErr);
    await supabase.from("pack_sessions").delete().eq("id", created.id);
    return { ok: false, error: "Could not build the pack checklist. Try again." };
  }

  const session = await getPackSession(created.id);
  if (!session) return { ok: false, error: "Could not load the new pack session." };
  return { ok: true, session };
}

async function startDemoSession(order: Order, user: AppUser): Promise<PackResult> {
  const existing = DEMO_PACK_SESSIONS.find(
    (s) => s.orderId === order.id && s.status === "in_progress",
  );
  if (existing) return { ok: true, session: clone(existing) };

  const items = await buildChecklist(order);

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
  const user = await requirePermission("warehouse.edit");
  const code = barcode.trim();
  if (!code) return { ok: false, error: "Empty scan." };

  const session = await getPackSession(sessionId);
  if (!session) return { ok: false, error: "Pack session not found." };
  if (session.status === "completed") return { ok: false, error: "Session already completed." };

  const current = session.items.find((i) => i.scanned < i.required);
  if (!current) return { ok: false, error: "All items already scanned." };

  if (code !== current.barcode && code !== current.sku) {
    const other = session.items.find((i) => i.barcode === code || i.sku === code);
    if (other) {
      return {
        ok: false,
        error: `Finish "${current.name}" (${current.scanned}/${current.required}) before scanning ${other.name}.`,
      };
    }
    return { ok: false, error: `Unknown barcode "${code}" — not part of this order.` };
  }

  if (!shouldUseSupabaseData()) {
    current.scanned += 1;
    session.scans.push({ sku: current.sku, name: current.name, at: new Date().toISOString() });
    const stored = DEMO_PACK_SESSIONS.find((s) => s.id === sessionId);
    if (stored) {
      const line = stored.items.find((i) => i.sku === current.sku);
      if (line) line.scanned = current.scanned;
      stored.scans = session.scans;
    }
    return { ok: true, session: clone(session) };
  }

  const supabase = await createSupabaseServerClient();
  // Compare-and-set on the count we read, so two scanners on the same session
  // cannot both turn 1/2 into 2/2 off the same stale read.
  const { data: updated, error: updateErr } = await supabase
    .from("pack_session_items")
    .update({ scanned: current.scanned + 1 })
    .eq("session_id", sessionId)
    .eq("sku", current.sku)
    .eq("scanned", current.scanned)
    .select("id")
    .maybeSingle();
  if (updateErr) {
    console.error("[pack] record scan failed", updateErr);
    return { ok: false, error: "Could not record the scan. Try again." };
  }
  if (!updated) {
    return { ok: false, error: "This line was just updated elsewhere. Scan again." };
  }

  const { error: scanErr } = await supabase.from("pack_scans").insert({
    session_id: sessionId,
    product_id: current.productId || null,
    sku: current.sku,
    name: current.name,
    scanned_by: user.id,
  });
  if (scanErr) console.error("[pack] append scan log failed", scanErr);

  const refreshed = await getPackSession(sessionId);
  if (!refreshed) return { ok: false, error: "Could not reload the pack session." };
  return { ok: true, session: refreshed };
}

/** Complete a fully-scanned session and mark the order packed. */
export async function completePackSession(sessionId: string): Promise<PackResult> {
  await requirePermission("warehouse.edit");

  const session = await getPackSession(sessionId);
  if (!session) return { ok: false, error: "Pack session not found." };

  const incomplete = session.items.some((i) => i.scanned < i.required);
  if (incomplete) return { ok: false, error: "Not all items have been scanned." };

  const completedAt = new Date().toISOString();

  if (!shouldUseSupabaseData()) {
    const stored = DEMO_PACK_SESSIONS.find((s) => s.id === sessionId);
    if (stored) {
      stored.status = "completed";
      stored.completedAt = completedAt;
    }
    const order = DEMO_ORDERS.find((o) => o.id === session.orderId);
    if (order && order.status !== "shipped" && order.status !== "delivered") {
      order.status = "packed";
      order.updatedAt = completedAt;
    }
    revalidatePath("/warehouse");
    return { ok: true, session: clone(stored ?? session) };
  }

  const supabase = await createSupabaseServerClient();
  const { error: sessionErr } = await supabase
    .from("pack_sessions")
    .update({ status: "completed", completed_at: completedAt })
    .eq("id", sessionId)
    .eq("status", "in_progress");
  if (sessionErr) {
    console.error("[pack] complete session failed", sessionErr);
    return { ok: false, error: "Could not complete the pack session. Try again." };
  }

  const { error: orderErr } = await supabase
    .from("orders")
    .update({ status: "packed", updated_at: completedAt })
    .eq("id", session.orderId)
    .in("status", ["paid", "allocated"]);
  if (orderErr) console.error("[pack] mark order packed failed", orderErr);

  revalidatePath("/warehouse");
  revalidatePath("/warehouse/pack");

  const refreshed = await getPackSession(sessionId);
  return { ok: true, session: refreshed ?? session };
}

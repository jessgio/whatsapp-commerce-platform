import { NextRequest, NextResponse } from "next/server";
import { env, isSupabaseConfigured } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { safeEqual, verifyHmacSha256 } from "@/lib/webhook-auth";

// Signature verification uses node:crypto and the service-role client.
export const runtime = "nodejs";

const STATUS_MAP: Record<string, string> = {
  confirmed: "requested",
  allocated: "requested",
  picking_up: "picked_up",
  picked: "picked_up",
  dropping_off: "in_transit",
  on_the_way: "in_transit",
  delivered: "delivered",
  returned: "returned",
};

/** Biteship tracking webhook -> updates shipment + appends a tracking event. */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  // This endpoint had no authentication at all: anyone could mark orders
  // delivered. Demo mode has nothing to protect, so only live data fails closed.
  const secret = env.shipping.webhookSecret;
  if (secret) {
    if (!isAuthentic(rawBody, req, secret)) {
      return NextResponse.json({ ok: false, error: "bad signature" }, { status: 403 });
    }
  } else if (isSupabaseConfigured()) {
    console.error("[webhook:shipping] BITESHIP_WEBHOOK_SECRET is not set; rejecting delivery");
    return NextResponse.json({ ok: false, error: "not configured" }, { status: 503 });
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const referenceId = (body.order_id ?? body.reference_id) as string | undefined;
  const biteshipOrderId = (body.id ?? referenceId) as string | undefined;
  const courierStatus = String(body.status ?? body.courier_status ?? "");
  const mapped = STATUS_MAP[courierStatus] ?? "in_transit";

  if (!isSupabaseConfigured()) {
    console.info("[webhook:shipping] (demo)", referenceId, courierStatus, "->", mapped);
    return NextResponse.json({ ok: true });
  }

  if (!biteshipOrderId) {
    return NextResponse.json({ ok: false, error: "missing shipment id" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

  const { data: shipment, error: shipmentErr } = await supabase
    .from("shipments")
    .update({ status: mapped })
    .eq("biteship_order_id", biteshipOrderId)
    .select("id")
    .maybeSingle();
  if (shipmentErr) {
    console.error("[webhook:shipping] shipment update failed", shipmentErr);
    return NextResponse.json({ ok: false, error: "update failed" }, { status: 500 });
  }
  if (!shipment) {
    // Answering 200 here would silently drop the update; a 404 lets Biteship
    // retry and surfaces the mismatch in their delivery log.
    console.error("[webhook:shipping] no shipment for", biteshipOrderId);
    return NextResponse.json({ ok: false, error: "unknown shipment" }, { status: 404 });
  }

  const at =
    typeof body.updated_at === "string" ? body.updated_at : new Date().toISOString();
  const note =
    (body.note as string | undefined) ??
    ((body.courier_tracking as { message?: string } | undefined)?.message ?? "");

  // Retried deliveries would otherwise duplicate the timeline entry.
  const { data: existing } = await supabase
    .from("shipment_events")
    .select("id")
    .eq("shipment_id", shipment.id)
    .eq("status", courierStatus)
    .eq("at", at)
    .maybeSingle();

  if (!existing) {
    const { error: eventErr } = await supabase.from("shipment_events").insert({
      shipment_id: shipment.id,
      status: courierStatus,
      note,
      at,
    });
    if (eventErr) console.error("[webhook:shipping] append event failed", eventErr);
  }

  return NextResponse.json({ ok: true });
}

/**
 * Biteship signs with an HMAC header on some plans and a static shared secret
 * on others, so accept either against the same configured value.
 */
function isAuthentic(rawBody: string, req: NextRequest, secret: string): boolean {
  const signature = req.headers.get("x-biteship-signature");
  if (signature) return verifyHmacSha256(rawBody, signature, secret);
  return safeEqual(req.headers.get("x-biteship-webhook-token") ?? "", secret);
}

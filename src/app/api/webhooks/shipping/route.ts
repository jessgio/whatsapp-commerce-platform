import { NextRequest, NextResponse } from "next/server";
import { env, isSupabaseConfigured } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { safeEqual, verifyHmacSha256 } from "@/lib/webhook-auth";
import { mapBiteshipToShipmentStatus, normalizeBiteshipStatus } from "@/lib/biteship-status";

// Signature verification uses node:crypto and the service-role client.
export const runtime = "nodejs";

const FORWARD_TIMEOUT_MS = 8_000;

/** Biteship tracking webhook -> CRM shipment + optional fan-out to legacy packing. */
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
  const courierStatus = normalizeBiteshipStatus(String(body.status ?? body.courier_status ?? ""));
  const mapped = mapBiteshipToShipmentStatus(courierStatus);

  // Start fan-out immediately so the packing app is not blocked on CRM writes.
  const forwarded = forwardToLegacy(rawBody, req);

  if (!isSupabaseConfigured()) {
    console.info("[webhook:shipping] (demo)", referenceId, courierStatus, "->", mapped);
    await forwarded;
    return NextResponse.json({ ok: true });
  }

  if (!biteshipOrderId) {
    await forwarded;
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
    await forwarded;
    return NextResponse.json({ ok: false, error: "update failed" }, { status: 500 });
  }
  if (!shipment) {
    await forwarded;
    // Packing-app orders never exist in this CRM. 200 so Biteship does not
    // retry (which would duplicate the legacy delivery). Without a forward
    // target, 404 still surfaces a mismatch in their delivery log.
    if (env.shipping.webhookForwardUrl) {
      console.info("[webhook:shipping] no CRM shipment for", biteshipOrderId, "(forwarded)");
      return NextResponse.json({ ok: true, matched: false });
    }
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

  await forwarded;
  return NextResponse.json({ ok: true, matched: true });
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

/** Copy the verified payload to the legacy packing webhook. Failures are logged, not thrown. */
async function forwardToLegacy(rawBody: string, req: NextRequest): Promise<void> {
  const url = env.shipping.webhookForwardUrl.trim();
  if (!url) return;

  const headers = new Headers();
  headers.set("content-type", req.headers.get("content-type") ?? "application/json");

  const legacyKey = env.shipping.webhookForwardSignatureKey.trim();
  const legacySecret = env.shipping.webhookForwardSignatureSecret;
  if (legacyKey && legacySecret) {
    // Packing verifies its own dashboard header, not the CRM token Biteship sends us.
    headers.set(legacyKey, legacySecret);
  } else {
    console.warn(
      "[webhook:shipping] forwarding without packing signature env; packing may reject the POST",
    );
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: rawBody,
      signal: AbortSignal.timeout(FORWARD_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.error("[webhook:shipping] legacy forward", res.status, await res.text().catch(() => ""));
    }
  } catch (err) {
    console.error("[webhook:shipping] legacy forward failed", err);
  }
}

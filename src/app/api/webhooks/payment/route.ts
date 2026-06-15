import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { env, isSupabaseConfigured } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

/**
 * Payment notification handler (Midtrans + Xendit shapes). Idempotent via the
 * `webhook_events` table. Marks the matching order paid/expired.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false }, { status: 400 });

  let orderCode: string | undefined;
  let paid = false;
  let expired = false;

  if (env.payments.provider === "midtrans") {
    orderCode = body.order_id;
    // Verify Midtrans signature_key = sha512(order_id+status_code+gross_amount+serverKey)
    const expected = createHash("sha512")
      .update(`${body.order_id}${body.status_code}${body.gross_amount}${env.payments.midtransServerKey}`)
      .digest("hex");
    if (env.payments.midtransServerKey && body.signature_key && body.signature_key !== expected) {
      return NextResponse.json({ ok: false, error: "bad signature" }, { status: 403 });
    }
    paid = ["capture", "settlement"].includes(body.transaction_status);
    expired = ["expire", "cancel", "deny"].includes(body.transaction_status);
  } else {
    orderCode = body.external_id;
    paid = body.status === "PAID";
    expired = body.status === "EXPIRED";
  }

  if (!orderCode) return NextResponse.json({ ok: false }, { status: 400 });

  if (!isSupabaseConfigured()) {
    console.info("[webhook:payment] (demo)", orderCode, { paid, expired });
    return NextResponse.json({ ok: true });
  }

  const supabase = createSupabaseAdminClient();
  const eventId = `pay:${orderCode}:${paid ? "paid" : expired ? "expired" : "update"}`;

  // Idempotency guard.
  const { error: dupe } = await supabase
    .from("webhook_events")
    .insert({ id: eventId, source: "payment", payload: body });
  if (dupe) return NextResponse.json({ ok: true, duplicate: true });

  await supabase
    .from("orders")
    .update({
      payment_status: paid ? "paid" : expired ? "expired" : "pending",
      status: paid ? "paid" : undefined,
      updated_at: new Date().toISOString(),
    })
    .eq("code", orderCode);

  return NextResponse.json({ ok: true });
}

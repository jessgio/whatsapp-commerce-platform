import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { env, isSupabaseConfigured } from "@/lib/env";
import { sendOrderPaidReceipt } from "@/lib/order-receipt";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { safeEqual } from "@/lib/webhook-auth";

// Signature verification uses node:crypto and the service-role client.
export const runtime = "nodejs";

interface Notification {
  orderCode: string;
  paid: boolean;
  expired: boolean;
  /** Amount the provider says was settled, for cross-checking the order total. */
  amount: number | null;
}

/**
 * Payment notification handler (Midtrans + Xendit shapes). Idempotent via the
 * `webhook_events` table. Marks the matching order paid/expired and sends a
 * WhatsApp receipt on successful payment.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false }, { status: 400 });

  const midtrans = env.payments.provider === "midtrans";
  const secret = midtrans ? env.payments.midtransServerKey : env.payments.xenditCallbackToken;

  // Demo mode has no orders to protect, so an unconfigured secret just skips
  // verification. Against live data it has to fail closed instead.
  if (!secret && isSupabaseConfigured()) {
    console.error(
      `[webhook:payment] no ${midtrans ? "MIDTRANS_SERVER_KEY" : "XENDIT_CALLBACK_TOKEN"}; rejecting delivery`,
    );
    return NextResponse.json({ ok: false, error: "not configured" }, { status: 503 });
  }

  const parsed = midtrans
    ? parseMidtrans(body, secret)
    : parseXendit(body, req.headers.get("x-callback-token"), secret);

  if ("status" in parsed) return parsed.response;
  const { orderCode, paid, expired, amount } = parsed.notification;

  if (!isSupabaseConfigured()) {
    console.info("[webhook:payment] (demo)", orderCode, { paid, expired });
    return NextResponse.json({ ok: true });
  }

  const supabase = createSupabaseAdminClient();

  const { data: order, error: orderReadErr } = await supabase
    .from("orders")
    .select("id, total")
    .eq("code", orderCode)
    .maybeSingle();
  if (orderReadErr) {
    console.error("[webhook:payment] order lookup failed", orderReadErr);
    return NextResponse.json({ ok: false, error: "lookup failed" }, { status: 500 });
  }
  if (!order) return NextResponse.json({ ok: false, error: "unknown order" }, { status: 404 });

  // A correctly signed notification can still carry the wrong amount, so never
  // mark an order paid for less than it is worth.
  if (paid && amount !== null && amount < Number(order.total)) {
    console.error("[webhook:payment] underpayment", { orderCode, amount, total: order.total });
    return NextResponse.json({ ok: false, error: "amount mismatch" }, { status: 409 });
  }

  const eventId = `pay:${orderCode}:${paid ? "paid" : expired ? "expired" : "update"}`;
  const now = new Date().toISOString();

  const { error: updateErr } = await supabase
    .from("orders")
    .update({
      payment_status: paid ? "paid" : expired ? "expired" : "pending",
      ...(paid ? { status: "paid" } : {}),
      updated_at: now,
    })
    .eq("id", order.id);
  if (updateErr) {
    console.error("[webhook:payment] order update failed", updateErr);
    return NextResponse.json({ ok: false, error: "update failed" }, { status: 500 });
  }

  const { error: paymentErr } = await supabase
    .from("payments")
    .update({ status: paid ? "paid" : expired ? "expired" : "pending" })
    .eq("order_id", order.id)
    .eq("status", "pending");
  if (paymentErr) console.error("[webhook:payment] payment row update failed", paymentErr);

  // Claim the idempotency key only once the order is actually updated. Claiming
  // first meant a failed update left the key behind, so every provider retry
  // returned "duplicate" and the order stayed unpaid forever.
  const { error: claimErr } = await supabase
    .from("webhook_events")
    .insert({ id: eventId, source: "payment", payload: body });
  if (claimErr) {
    if (claimErr.code === "23505") {
      return NextResponse.json({ ok: true, duplicate: true });
    }
    console.error("[webhook:payment] idempotency claim failed", claimErr);
  }

  if (paid) {
    try {
      await sendOrderPaidReceipt(supabase, orderCode);
    } catch (e) {
      console.error("[webhook:payment] receipt send failed", e);
    }
  }

  return NextResponse.json({ ok: true });
}

type ParseOutcome =
  | { notification: Notification }
  | { status: number; response: NextResponse };

function reject(status: number, error: string): ParseOutcome {
  return { status, response: NextResponse.json({ ok: false, error }, { status }) };
}

function parseMidtrans(body: Record<string, unknown>, serverKey: string): ParseOutcome {
  const orderCode = typeof body.order_id === "string" ? body.order_id : "";
  if (!orderCode) return reject(400, "missing order_id");

  if (serverKey) {
    // signature_key = sha512(order_id + status_code + gross_amount + serverKey).
    // A missing signature previously skipped the check entirely, so an unsigned
    // request could mark any order paid.
    const expected = createHash("sha512")
      .update(`${orderCode}${body.status_code}${body.gross_amount}${serverKey}`)
      .digest("hex");
    const provided = typeof body.signature_key === "string" ? body.signature_key : "";
    if (!safeEqual(provided, expected)) return reject(403, "bad signature");
  }

  const status = String(body.transaction_status ?? "");
  return {
    notification: {
      orderCode,
      paid: ["capture", "settlement"].includes(status),
      expired: ["expire", "cancel", "deny"].includes(status),
      amount: toAmount(body.gross_amount),
    },
  };
}

function parseXendit(
  body: Record<string, unknown>,
  callbackToken: string | null,
  expectedToken: string,
): ParseOutcome {
  const orderCode = typeof body.external_id === "string" ? body.external_id : "";
  if (!orderCode) return reject(400, "missing external_id");

  // Previously the Xendit branch had no verification at all.
  if (expectedToken && !safeEqual(callbackToken ?? "", expectedToken)) {
    return reject(403, "bad callback token");
  }

  const status = String(body.status ?? "");
  return {
    notification: {
      orderCode,
      paid: status === "PAID",
      expired: status === "EXPIRED",
      amount: toAmount(body.paid_amount ?? body.amount),
    },
  };
}

function toAmount(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

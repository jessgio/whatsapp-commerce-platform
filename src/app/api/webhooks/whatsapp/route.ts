import { NextRequest, NextResponse } from "next/server";
import { createCartOrderFromInbound } from "@/lib/checkout-order";
import { parseWhatsAppOrder } from "@/lib/checkout";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import {
  parseInbound,
  verifyWebhook,
  verifyWebhookSignature,
  webhookSignatureConfigured,
} from "@/lib/integrations/whatsapp";

// Signature verification uses node:crypto and the service-role client.
export const runtime = "nodejs";

// Meta webhook verification handshake.
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");

  if (verifyWebhook(mode, token)) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

// Inbound messages + delivery status updates.
export async function POST(req: NextRequest) {
  // Read the raw bytes: the HMAC is over exactly what Meta sent, and
  // re-serialising parsed JSON would not reproduce it.
  const rawBody = await req.text();

  if (webhookSignatureConfigured()) {
    if (!verifyWebhookSignature(rawBody, req.headers.get("x-hub-signature-256"))) {
      return NextResponse.json({ ok: false, error: "bad signature" }, { status: 403 });
    }
  } else if (isSupabaseConfigured()) {
    // Live data with no way to authenticate the caller: fail closed rather than
    // let anyone who knows the URL inject messages and cart orders.
    console.error("[webhook:whatsapp] WHATSAPP_APP_SECRET is not set; rejecting delivery");
    return NextResponse.json({ ok: false, error: "not configured" }, { status: 503 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const inbound = parseInbound(payload);

  if (!isSupabaseConfigured()) {
    // Demo mode: acknowledge so Meta doesn't retry; log for visibility.
    console.info("[webhook:whatsapp] inbound (demo)", inbound.length, "messages");
    for (const msg of inbound) {
      if (parseWhatsAppOrder(msg.raw)) {
        console.info("[webhook:whatsapp] cart order (demo)", msg.waId, msg.text);
      }
    }
    return NextResponse.json({ ok: true, received: inbound.length });
  }

  const supabase = createSupabaseAdminClient();

  for (const msg of inbound) {
    // 1) Upsert customer keyed off the stable wa_id.
    const { data: customer } = await supabase
      .from("customers")
      .upsert(
        { wa_id: msg.waId, name: msg.name ?? msg.waId, phone: `+${msg.waId}` },
        { onConflict: "wa_id" },
      )
      .select("id")
      .single();

    if (!customer) continue;

    // 2) Ensure an open conversation exists.
    const { data: conv } = await supabase
      .from("conversations")
      .upsert(
        {
          customer_id: customer.id,
          status: "open",
          last_message_preview: msg.text,
          last_message_at: msg.timestamp,
          last_inbound_at: msg.timestamp,
        },
        { onConflict: "customer_id" },
      )
      .select("id")
      .single();

    if (!conv) continue;

    const isOrder = msg.type === "order" && Boolean(parseWhatsAppOrder(msg.raw));

    // 3) Cart submit → draft order + checkout link (idempotent via webhook_events).
    // Run before the inbound-message dedupe so a failed create can succeed on retry.
    if (isOrder) {
      await createCartOrderFromInbound({
        supabase,
        customerId: customer.id,
        conversationId: conv.id,
        waId: msg.waId,
        raw: msg.raw,
        waMessageId: msg.messageId,
        timestamp: msg.timestamp,
      });
    }

    // 4) Append the inbound message (skip duplicates).
    if (msg.messageId) {
      const { data: existing } = await supabase
        .from("messages")
        .select("id")
        .eq("wa_message_id", msg.messageId)
        .maybeSingle();
      if (existing) continue;
    }

    await supabase.from("messages").insert({
      conversation_id: conv.id,
      direction: "in",
      kind: isOrder ? "order" : msg.type === "text" ? "text" : "system",
      body: msg.text,
      wa_message_id: msg.messageId,
      created_at: msg.timestamp,
    });
  }

  return NextResponse.json({ ok: true, received: inbound.length });
}

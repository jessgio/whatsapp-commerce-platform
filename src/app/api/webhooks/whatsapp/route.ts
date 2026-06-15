import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { parseInbound, verifyWebhook } from "@/lib/integrations/whatsapp";

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
  const payload = await req.json().catch(() => null);
  if (!payload) return NextResponse.json({ ok: false }, { status: 400 });

  const inbound = parseInbound(payload);

  if (!isSupabaseConfigured()) {
    // Demo mode: acknowledge so Meta doesn't retry; log for visibility.
    console.info("[webhook:whatsapp] inbound (demo)", inbound.length, "messages");
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

    // 3) Append the inbound message.
    await supabase.from("messages").insert({
      conversation_id: conv.id,
      direction: "in",
      kind: msg.type === "text" ? "text" : "system",
      body: msg.text,
      created_at: msg.timestamp,
    });
  }

  return NextResponse.json({ ok: true, received: inbound.length });
}

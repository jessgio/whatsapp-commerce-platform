"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/guard";
import { getConversation } from "@/lib/data/repo";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sendText, sendTemplate } from "@/lib/integrations/whatsapp";

export async function sendReply(
  conversationId: string,
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  await requirePermission("inbox.reply");
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { ok: false, error: "Message is empty." };

  const conv = await getConversation(conversationId);
  if (!conv) return { ok: false, error: "Conversation not found." };

  // Inside the 24h window we can send free-form text; otherwise a template
  // would be required. The adapter no-ops to a mock when WA isn't configured.
  const result = await sendText(conv.customerWaId, body);
  if (!result.ok) {
    console.error("[inbox:sendReply] WhatsApp send failed", result.error);
    return { ok: false, error: formatWhatsAppError(result.error) };
  }

  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const now = new Date().toISOString();
    const { error: insertError } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      direction: "out",
      kind: "text",
      body,
      wa_message_id: result.messageId ?? null,
      created_at: now,
    });
    if (insertError) {
      console.error("[inbox:sendReply] DB insert failed", insertError);
      return {
        ok: false,
        error: "Message was sent on WhatsApp, but saving to the inbox failed. Refresh and check WhatsApp.",
      };
    }
    await supabase
      .from("conversations")
      .update({
        last_message_preview: body,
        last_message_at: now,
      })
      .eq("id", conversationId);
  }

  revalidatePath(`/inbox/${conversationId}`);
  revalidatePath("/inbox");
  return { ok: true };
}

export async function sendReopenTemplate(conversationId: string) {
  await requirePermission("inbox.reply");
  const conv = await getConversation(conversationId);
  if (!conv) return;
  await sendTemplate(conv.customerWaId, "reorder_followup_id");
  revalidatePath(`/inbox/${conversationId}`);
}

function formatWhatsAppError(raw?: string): string {
  if (!raw) {
    return "WhatsApp rejected the message. Check WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID.";
  }
  try {
    const parsed = JSON.parse(raw) as {
      error?: { message?: string; error_user_msg?: string; code?: number };
    };
    const msg = parsed.error?.error_user_msg || parsed.error?.message;
    if (msg) return msg;
  } catch {
    // raw may already be a plain string
  }
  return raw.length > 280 ? `${raw.slice(0, 280)}…` : raw;
}

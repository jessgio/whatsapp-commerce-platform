import "server-only";
import { revalidatePath } from "next/cache";
import { getConversation } from "@/lib/data/repo";
import { shouldUseSupabaseData } from "@/lib/data/mode";
import { appendDemoOutboundMessage } from "@/lib/demo/data";
import { sendText } from "@/lib/integrations/whatsapp";
import { claimConversation } from "@/lib/services/cs-routing";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

/** Shared reply send used by portal Server Actions and staff API. */
export async function sendConversationReply(
  conversationId: string,
  body: string,
  options?: { actorId?: string },
): Promise<{ ok: boolean; error?: string }> {
  const trimmed = body.trim();
  if (!trimmed) return { ok: false, error: "Message is empty." };

  const conv = await getConversation(conversationId);
  if (!conv) return { ok: false, error: "Conversation not found." };

  const result = await sendText(conv.customerWaId, trimmed);
  if (!result.ok) {
    console.error("[inbox:sendReply] WhatsApp send failed", result.error);
    return { ok: false, error: formatWhatsAppError(result.error) };
  }

  if (shouldUseSupabaseData()) {
    const supabase = await createSupabaseServerClient();
    const now = new Date().toISOString();
    const { error: insertError } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      direction: "out",
      kind: "text",
      body: trimmed,
      wa_message_id: result.messageId ?? null,
      created_at: now,
    });
    if (insertError) {
      console.error("[inbox:sendReply] DB insert failed", insertError);
      return {
        ok: false,
        error:
          "Message was sent on WhatsApp, but saving to the inbox failed. Refresh and check WhatsApp.",
      };
    }
    await supabase
      .from("conversations")
      .update({
        last_message_preview: trimmed,
        last_message_at: now,
      })
      .eq("id", conversationId);
  } else {
    appendDemoOutboundMessage(conversationId, trimmed);
  }

  if (!conv.assigneeId && options?.actorId) {
    await claimConversation(conversationId, options.actorId);
  }

  revalidatePath(`/inbox/${conversationId}`);
  revalidatePath("/inbox");
  return { ok: true };
}

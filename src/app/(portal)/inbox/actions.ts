"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/guard";
import { getConversation } from "@/lib/data/repo";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sendText, sendTemplate } from "@/lib/integrations/whatsapp";

export async function sendReply(conversationId: string, formData: FormData) {
  await requirePermission("inbox.reply");
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return;

  const conv = await getConversation(conversationId);
  if (!conv) return;

  // Inside the 24h window we can send free-form text; otherwise a template
  // would be required. The adapter no-ops to a mock when WA isn't configured.
  const result = await sendText(conv.customerWaId, body);

  if (isSupabaseConfigured() && result.ok) {
    const supabase = await createSupabaseServerClient();
    const now = new Date().toISOString();
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      direction: "out",
      kind: "text",
      body,
      wa_message_id: result.messageId ?? null,
      created_at: now,
    });
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
}

export async function sendReopenTemplate(conversationId: string) {
  await requirePermission("inbox.reply");
  const conv = await getConversation(conversationId);
  if (!conv) return;
  await sendTemplate(conv.customerWaId, "reorder_followup_id");
  revalidatePath(`/inbox/${conversationId}`);
}

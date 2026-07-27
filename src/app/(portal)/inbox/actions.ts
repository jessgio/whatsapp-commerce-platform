"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/guard";
import { getConversation } from "@/lib/data/repo";
import { sendTemplate } from "@/lib/integrations/whatsapp";
import { sendConversationReply } from "@/lib/services/inbox-reply";

export async function sendReply(
  conversationId: string,
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  await requirePermission("inbox.reply");
  const body = String(formData.get("body") ?? "");
  return sendConversationReply(conversationId, body);
}

export async function sendReopenTemplate(conversationId: string) {
  await requirePermission("inbox.reply");
  const conv = await getConversation(conversationId);
  if (!conv) return;
  await sendTemplate(conv.customerWaId, "reorder_followup_id");
  revalidatePath(`/inbox/${conversationId}`);
}

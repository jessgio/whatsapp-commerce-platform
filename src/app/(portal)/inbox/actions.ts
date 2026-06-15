"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/guard";
import { getConversation } from "@/lib/data/repo";
import { sendText, sendTemplate } from "@/lib/integrations/whatsapp";

export async function sendReply(conversationId: string, formData: FormData) {
  await requirePermission("inbox.reply");
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return;

  const conv = await getConversation(conversationId);
  if (!conv) return;

  // Inside the 24h window we can send free-form text; otherwise a template
  // would be required. The adapter no-ops to a mock when WA isn't configured.
  await sendText(conv.customerWaId, body);
  revalidatePath(`/inbox/${conversationId}`);
}

export async function sendReopenTemplate(conversationId: string) {
  await requirePermission("inbox.reply");
  const conv = await getConversation(conversationId);
  if (!conv) return;
  await sendTemplate(conv.customerWaId, "reorder_followup_id");
  revalidatePath(`/inbox/${conversationId}`);
}

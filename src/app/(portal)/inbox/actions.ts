"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/guard";
import { getConversation } from "@/lib/data/repo";
import { sendTemplate } from "@/lib/integrations/whatsapp";
import {
  assignConversationTo,
  claimConversation,
  routeUnassignedOpen,
} from "@/lib/services/cs-routing";
import { sendConversationReply } from "@/lib/services/inbox-reply";

export async function sendReply(
  conversationId: string,
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const user = await requirePermission("inbox.reply");
  const body = String(formData.get("body") ?? "");
  return sendConversationReply(conversationId, body, { actorId: user.id });
}

export async function sendReopenTemplate(conversationId: string) {
  await requirePermission("inbox.reply");
  const conv = await getConversation(conversationId);
  if (!conv) return;
  await sendTemplate(conv.customerWaId, "reorder_followup_id");
  revalidatePath(`/inbox/${conversationId}`);
}

export async function assignConversation(
  conversationId: string,
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  await requirePermission("inbox.reply");
  const raw = String(formData.get("assigneeId") ?? "");
  const assigneeId = raw.trim() ? raw : null;
  return assignConversationTo(conversationId, assigneeId);
}

export async function claimConversationAction(
  conversationId: string,
): Promise<{ ok: boolean; error?: string }> {
  const user = await requirePermission("inbox.reply");
  return claimConversation(conversationId, user.id);
}

export async function routeUnassignedAction(): Promise<{
  ok: boolean;
  routed?: number;
  error?: string;
}> {
  await requirePermission("inbox.reply");
  return routeUnassignedOpen();
}

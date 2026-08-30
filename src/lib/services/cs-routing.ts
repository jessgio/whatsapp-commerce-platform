import "server-only";
import { revalidatePath } from "next/cache";
import {
  assignableAgents,
  isOpenForRouting,
  pickLeastLoaded,
  routingPool,
  withOpenCounts,
} from "@/lib/cs-routing";
import {
  countOpenConversationsByAssignee,
  getConversation,
  listConversations,
  listStaffUsers,
  updateConversationAssignee,
  type DataClientMode,
} from "@/lib/data/repo";
import type { AppUser } from "@/lib/types";

function revalidateInbox(conversationId?: string) {
  revalidatePath("/inbox");
  revalidatePath("/cs-dashboard");
  if (conversationId) revalidatePath(`/inbox/${conversationId}`);
}

async function nextAgent(mode: DataClientMode): Promise<AppUser | null> {
  const [users, openByAssignee] = await Promise.all([
    listStaffUsers(mode),
    countOpenConversationsByAssignee(mode),
  ]);
  const picked = pickLeastLoaded(
    withOpenCounts(routingPool(users), openByAssignee),
  );
  if (!picked) return null;
  return users.find((u) => u.id === picked.id) ?? null;
}

export async function assignConversationTo(
  conversationId: string,
  assigneeId: string | null,
  options?: { mode?: DataClientMode },
): Promise<{ ok: boolean; error?: string }> {
  const mode = options?.mode ?? "session";
  const conv = await getConversation(conversationId, mode);
  if (!conv) return { ok: false, error: "Conversation not found." };

  if (assigneeId) {
    const users = await listStaffUsers(mode);
    const agent = assignableAgents(users).find((u) => u.id === assigneeId);
    if (!agent) return { ok: false, error: "That teammate cannot own inbox chats." };
  }

  const updated = await updateConversationAssignee(conversationId, assigneeId, {
    mode,
  });
  if (!updated) return { ok: false, error: "Could not update assignment." };
  revalidateInbox(conversationId);
  return { ok: true };
}

export async function claimConversation(
  conversationId: string,
  userId: string,
  options?: { mode?: DataClientMode },
): Promise<{ ok: boolean; error?: string }> {
  return assignConversationTo(conversationId, userId, options);
}

/** Assign the least-loaded CS agent when the thread has no owner. */
export async function routeIfUnassigned(
  conversationId: string,
  options?: { mode?: DataClientMode },
): Promise<{ ok: boolean; assignee?: AppUser | null; error?: string }> {
  const mode = options?.mode ?? "session";
  const conv = await getConversation(conversationId, mode);
  if (!conv) return { ok: false, error: "Conversation not found." };
  if (!isOpenForRouting(conv)) {
    return { ok: true, assignee: null };
  }

  const agent = await nextAgent(mode);
  if (!agent) {
    return { ok: false, error: "No CS (or sales) agent available to route to." };
  }

  const updated = await updateConversationAssignee(conversationId, agent.id, {
    mode,
    onlyIfUnassigned: true,
  });
  if (!updated) return { ok: true, assignee: null };
  revalidateInbox(conversationId);
  return { ok: true, assignee: agent };
}

/** Drain the unassigned open queue, one chat at a time so load stays even. */
export async function routeUnassignedOpen(options?: {
  mode?: DataClientMode;
}): Promise<{ ok: boolean; routed: number; error?: string }> {
  const mode = options?.mode ?? "session";
  const conversations = await listConversations();
  const targets = conversations.filter(isOpenForRouting);
  if (targets.length === 0) return { ok: true, routed: 0 };

  let routed = 0;
  for (const conv of targets) {
    const result = await routeIfUnassigned(conv.id, { mode });
    if (!result.ok) return { ok: false, routed, error: result.error };
    if (result.assignee) routed += 1;
  }
  revalidateInbox();
  return { ok: true, routed };
}

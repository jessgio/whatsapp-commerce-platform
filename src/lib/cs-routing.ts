import type { AppUser, Conversation, Role } from "@/lib/types";

export type AgentLoad = {
  id: string;
  name: string;
  role: Role;
  openCount: number;
};

const ROUTING_ROLES: Role[] = ["cs"];
const FALLBACK_ROLES: Role[] = ["sales"];
const LAST_RESORT_ROLES: Role[] = ["admin"];
const ASSIGNABLE_ROLES: Role[] = ["admin", "sales", "cs"];

/** Agents who can own an inbox thread (manual assign / claim). */
export function assignableAgents(users: AppUser[]): AppUser[] {
  return users.filter((u) => ASSIGNABLE_ROLES.includes(u.role));
}

/**
 * Auto-route pool: CS first. If the team has no CS users yet, fall back to
 * sales so chats still land on someone who can reply.
 */
export function routingPool(users: AppUser[]): AppUser[] {
  const cs = users.filter((u) => ROUTING_ROLES.includes(u.role));
  if (cs.length > 0) return cs;
  const sales = users.filter((u) => FALLBACK_ROLES.includes(u.role));
  if (sales.length > 0) return sales;
  return users.filter((u) => LAST_RESORT_ROLES.includes(u.role));
}

export function isOpenForRouting(conversation: Pick<Conversation, "status" | "assigneeId">) {
  return conversation.status !== "resolved" && !conversation.assigneeId;
}

/** Least open chats wins; stable tie-break on id so the pick is deterministic. */
export function pickLeastLoaded(agents: AgentLoad[]): AgentLoad | null {
  if (agents.length === 0) return null;
  return agents.reduce((best, agent) => {
    if (agent.openCount < best.openCount) return agent;
    if (agent.openCount === best.openCount && agent.id < best.id) return agent;
    return best;
  });
}

export function withOpenCounts(
  agents: AppUser[],
  openByAssignee: Map<string, number>,
): AgentLoad[] {
  return agents.map((agent) => ({
    id: agent.id,
    name: agent.name,
    role: agent.role,
    openCount: openByAssignee.get(agent.id) ?? 0,
  }));
}

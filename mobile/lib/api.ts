import { API_URL } from "./config";
import type { AppUser, Conversation, Message, Order, Permission } from "./types";

export type AuthMode =
  | { kind: "bearer"; accessToken: string }
  | { kind: "demo"; userId: string };

let authMode: AuthMode | null = null;

export function setApiAuth(mode: AuthMode | null) {
  authMode = mode;
}

export function getApiAuth() {
  return authMode;
}

async function staffFetch<T>(path: string, init?: RequestInit): Promise<T> {
  if (!authMode) throw new Error("Not signed in.");

  const authorization =
    authMode.kind === "bearer"
      ? `Bearer ${authMode.accessToken}`
      : `Demo ${authMode.userId}`;

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: authorization,
      ...(init?.headers ?? {}),
    },
  });

  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export async function fetchMe() {
  return staffFetch<{ user: AppUser; permissions: Permission[] }>("/api/staff/me");
}

export async function fetchConversations() {
  return staffFetch<{ conversations: Conversation[] }>("/api/staff/conversations");
}

export async function fetchConversation(id: string) {
  return staffFetch<{ conversation: Conversation; messages: Message[] }>(
    `/api/staff/conversations/${id}`,
  );
}

export async function sendReply(id: string, body: string) {
  return staffFetch<{ ok: boolean }>(`/api/staff/conversations/${id}/reply`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
}

export async function assignConversation(
  id: string,
  payload: { assigneeId?: string | null; claim?: boolean },
) {
  return staffFetch<{ ok: boolean }>(`/api/staff/conversations/${id}/assign`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchOrders() {
  return staffFetch<{ orders: Order[] }>("/api/staff/orders");
}

export async function fetchOrder(id: string) {
  return staffFetch<{ order: Order }>(`/api/staff/orders/${id}`);
}

export async function generatePaymentLink(id: string) {
  return staffFetch<{ ok: boolean; paymentUrl?: string }>(
    `/api/staff/orders/${id}/payment-link`,
    { method: "POST" },
  );
}

export async function advanceOrder(id: string) {
  return staffFetch<{ ok: boolean; status?: string }>(
    `/api/staff/orders/${id}/advance`,
    { method: "POST" },
  );
}

export async function raiseNotice(id: string, message: string) {
  return staffFetch<{ ok: boolean }>(`/api/staff/orders/${id}/notice`, {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}

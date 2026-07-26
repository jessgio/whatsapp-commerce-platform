import { env } from "@/lib/env";

const GRAPH = "https://graph.facebook.com/v21.0";

interface SendResult {
  ok: boolean;
  messageId?: string;
  mocked?: boolean;
  error?: string;
}

function configured(): boolean {
  return Boolean(env.whatsapp.token && env.whatsapp.phoneNumberId);
}

/** Send a free-form text message (only valid inside the 24h customer window). */
export async function sendText(to: string, body: string): Promise<SendResult> {
  if (!configured()) {
    console.info("[whatsapp:mock] sendText", { to, body });
    return { ok: true, mocked: true, messageId: `mock-${Date.now()}` };
  }
  return graphSend({
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { preview_url: false, body },
  });
}

/**
 * Send a pre-approved template (required to (re)open a conversation outside the
 * 24h window — the compliant way to reach the gathered contact list).
 */
export async function sendTemplate(
  to: string,
  templateName: string,
  languageCode = "id",
  components?: unknown[],
): Promise<SendResult> {
  if (!configured()) {
    console.info("[whatsapp:mock] sendTemplate", { to, templateName });
    return { ok: true, mocked: true, messageId: `mock-tpl-${Date.now()}` };
  }
  return graphSend({
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: templateName,
      language: { code: languageCode },
      ...(components ? { components } : {}),
    },
  });
}

async function graphSend(payload: Record<string, unknown>): Promise<SendResult> {
  try {
    const res = await fetch(`${GRAPH}/${env.whatsapp.phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.whatsapp.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) return { ok: false, error: JSON.stringify(json) };
    return { ok: true, messageId: json.messages?.[0]?.id };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

/** Verify Meta webhook subscription handshake. */
export function verifyWebhook(mode: string | null, token: string | null): boolean {
  return mode === "subscribe" && token === env.whatsapp.verifyToken;
}

/** Minimal normalizer for inbound webhook payloads -> internal message shape. */
export interface InboundMessage {
  waId: string;
  name: string | null;
  text: string;
  type: string;
  timestamp: string;
  messageId: string | null;
  raw: unknown;
}

function inboundPreview(msg: any): string {
  if (msg.type === "order") {
    const items = msg.order?.product_items;
    const count = Array.isArray(items) ? items.length : 0;
    return count > 0 ? `[order] ${count} item(s)` : "[order]";
  }
  return msg.text?.body ?? msg.button?.text ?? `[${msg.type}]`;
}

export function parseInbound(payload: any): InboundMessage[] {
  const out: InboundMessage[] = [];
  const entries = payload?.entry ?? [];
  for (const entry of entries) {
    for (const change of entry.changes ?? []) {
      const value = change.value ?? {};
      const contacts = value.contacts ?? [];
      for (const msg of value.messages ?? []) {
        const contact = contacts.find((c: any) => c.wa_id === msg.from);
        out.push({
          waId: msg.from,
          name: contact?.profile?.name ?? null,
          text: inboundPreview(msg),
          type: msg.type,
          timestamp: new Date(Number(msg.timestamp) * 1000).toISOString(),
          messageId: typeof msg.id === "string" ? msg.id : null,
          raw: msg,
        });
      }
    }
  }
  return out;
}

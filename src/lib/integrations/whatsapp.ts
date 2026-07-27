import { env } from "@/lib/env";
import { safeEqual, verifyHmacSha256 } from "@/lib/webhook-auth";
import { buildInteractivePayload } from "@/lib/integrations/whatsapp-interactive";
import type { WaInteractiveDesign } from "@/lib/whatsapp-designs";

const GRAPH = "https://graph.facebook.com/v21.0";

export interface SendResult {
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
    console.info("[whatsapp:mock] sendTemplate", { to, templateName, components });
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

/**
 * Send a session interactive / image / text design via Cloud API payloads.
 * Only valid inside the 24h customer care window.
 */
export async function sendInteractiveDesign(
  to: string,
  design: WaInteractiveDesign,
): Promise<SendResult> {
  const payload = buildInteractivePayload(to, design);
  if (!payload) {
    return { ok: false, error: "Invalid interactive design payload." };
  }
  if (!configured()) {
    console.info("[whatsapp:mock] sendInteractiveDesign", {
      to,
      kind: design.kind,
      type: payload.type,
    });
    return { ok: true, mocked: true, messageId: `mock-int-${Date.now()}` };
  }
  return graphSend(payload);
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
  if (!env.whatsapp.verifyToken) return false;
  return mode === "subscribe" && safeEqual(token ?? "", env.whatsapp.verifyToken);
}

/**
 * Verify the `X-Hub-Signature-256` HMAC Meta sends with every delivery. Without
 * this, anyone who knows the URL can inject inbound messages and cart orders.
 * Returns false when no app secret is configured so the webhook fails closed.
 */
export function verifyWebhookSignature(rawBody: string, header: string | null): boolean {
  return verifyHmacSha256(rawBody, header, env.whatsapp.appSecret);
}

/** Whether inbound signature verification can run at all. */
export function webhookSignatureConfigured(): boolean {
  return Boolean(env.whatsapp.appSecret);
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

interface RawContact {
  wa_id?: string;
  profile?: { name?: string };
}

interface RawMessage {
  from?: string;
  id?: string;
  type?: string;
  timestamp?: string | number;
  text?: { body?: string };
  button?: { text?: string };
  order?: { product_items?: unknown[] };
}

interface WebhookPayload {
  entry?: Array<{
    changes?: Array<{
      value?: { contacts?: RawContact[]; messages?: RawMessage[] };
    }>;
  }>;
}

function inboundPreview(msg: RawMessage): string {
  if (msg.type === "order") {
    const items = msg.order?.product_items;
    const count = Array.isArray(items) ? items.length : 0;
    return count > 0 ? `[order] ${count} item(s)` : "[order]";
  }
  return msg.text?.body ?? msg.button?.text ?? `[${msg.type ?? "unknown"}]`;
}

function inboundTimestamp(value: RawMessage["timestamp"]): string {
  const seconds = Number(value);
  // Meta sends unix seconds; a malformed value would otherwise throw a
  // RangeError from toISOString and take down the whole batch.
  if (!Number.isFinite(seconds) || seconds <= 0) return new Date().toISOString();
  return new Date(seconds * 1000).toISOString();
}

export function parseInbound(payload: unknown): InboundMessage[] {
  const out: InboundMessage[] = [];
  // Single cast at the trust boundary: everything below treats the payload as
  // untrusted and optional.
  const entries = (payload as WebhookPayload | null)?.entry ?? [];
  for (const entry of entries) {
    for (const change of entry.changes ?? []) {
      const contacts = change.value?.contacts ?? [];
      for (const msg of change.value?.messages ?? []) {
        if (!msg.from) continue;
        const contact = contacts.find((c) => c.wa_id === msg.from);
        out.push({
          waId: msg.from,
          name: contact?.profile?.name ?? null,
          text: inboundPreview(msg),
          type: msg.type ?? "unknown",
          timestamp: inboundTimestamp(msg.timestamp),
          messageId: typeof msg.id === "string" ? msg.id : null,
          raw: msg,
        });
      }
    }
  }
  return out;
}

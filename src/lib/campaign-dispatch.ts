import "server-only";
import { mapWithConcurrency } from "@/lib/concurrency";
import {
  claimCampaignForSend,
  getCampaign,
  listDueCampaigns,
  saveCampaign,
} from "@/lib/data/campaigns";
import { listConversations, listCustomers } from "@/lib/data/repo";
import { getSegmentDefinition } from "@/lib/data/segments";
import {
  getWaInteractiveDesign,
  getWaTemplateDesign,
} from "@/lib/data/whatsapp-designs";
import { sendCampaignEmailBatch } from "@/lib/email-campaign";
import { buildTemplateComponents } from "@/lib/integrations/whatsapp-interactive";
import {
  sendInteractiveDesign,
  sendTemplate,
} from "@/lib/integrations/whatsapp";
import { filterCustomersByRules } from "@/lib/segments";
import type { Campaign } from "@/lib/campaigns";
import type { Customer } from "@/lib/types";

const WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Messages in flight against the Graph API. Sending one at a time made send
 * time linear in audience size — a few hundred recipients at ~250ms each ran
 * past the function timeout. Conservative next to Meta's per-number throughput.
 */
const WA_CONCURRENCY = 8;

export type DispatchResult = {
  ok: boolean;
  id: string;
  sent: number;
  failed: number;
  skipped: number;
  error?: string;
};

function firstName(name: string): string {
  const part = name.trim().split(/\s+/)[0];
  return part || name.trim() || "friend";
}

function inMessagingWindow(lastInboundAt: string | null | undefined): boolean {
  if (!lastInboundAt) return false;
  const t = new Date(lastInboundAt).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t < WINDOW_MS;
}

async function resolveAudience(campaign: Campaign): Promise<{
  ok: true;
  audience: Customer[];
} | { ok: false; error: string }> {
  if (!campaign.segmentId) {
    return { ok: false, error: "Select a customer segment first." };
  }
  const [segment, customers] = await Promise.all([
    getSegmentDefinition(campaign.segmentId),
    listCustomers(),
  ]);
  if (!segment) return { ok: false, error: "Segment not found." };

  const audience = filterCustomersByRules(customers, segment.rules).filter(
    (c) => c.consentStatus === "opted_in",
  );
  if (audience.length === 0) {
    return { ok: false, error: "No opted-in customers match this segment." };
  }
  return { ok: true, audience };
}

function tally(results: Array<{ ok: boolean }>): {
  sent: number;
  failed: number;
  skipped: number;
} {
  const sent = results.filter((r) => r.ok).length;
  return { sent, failed: results.length - sent, skipped: 0 };
}

async function dispatchWhatsApp(
  campaign: Campaign,
  audience: Customer[],
): Promise<{ sent: number; failed: number; skipped: number; error?: string }> {
  if (campaign.waMode === "template" && campaign.waDesignId) {
    const design = await getWaTemplateDesign(campaign.waDesignId);
    if (!design) {
      return { sent: 0, failed: 0, skipped: 0, error: "WhatsApp template design missing." };
    }

    const results = await mapWithConcurrency(audience, WA_CONCURRENCY, (customer) => {
      const components = buildTemplateComponents(design, {
        ...design.variableDefaults,
        "1": firstName(customer.name),
      });
      return sendTemplate(
        customer.waId || customer.phone,
        design.metaTemplateName,
        design.languageCode,
        components.length ? components : undefined,
      );
    });
    return tally(results);
  }

  if (campaign.waMode === "interactive" && campaign.waDesignId) {
    const design = await getWaInteractiveDesign(campaign.waDesignId);
    if (!design) {
      return { sent: 0, failed: 0, skipped: 0, error: "Interactive design missing." };
    }

    const conversations = await listConversations();
    const inboundByCustomer = new Map(
      conversations.map((c) => [c.customerId, c.lastInboundAt] as const),
    );

    // Interactive messages are only deliverable inside the 24h service window.
    const reachable = audience.filter((c) =>
      inMessagingWindow(inboundByCustomer.get(c.id) ?? null),
    );
    const skipped = audience.length - reachable.length;

    const results = await mapWithConcurrency(reachable, WA_CONCURRENCY, (customer) =>
      sendInteractiveDesign(customer.waId || customer.phone, design),
    );
    return { ...tally(results), skipped };
  }

  return {
    sent: 0,
    failed: 0,
    skipped: 0,
    error: "WhatsApp design is not configured.",
  };
}

/**
 * Dispatch a single campaign (send-now or cron). Caller should claim first when
 * racing with the scheduler; `dispatchCampaign` claims if status is still
 * draft/scheduled.
 */
export async function dispatchCampaign(id: string): Promise<DispatchResult> {
  const existing = await getCampaign(id);
  if (!existing) {
    return { ok: false, id, sent: 0, failed: 0, skipped: 0, error: "Campaign not found." };
  }

  if (existing.status === "sending") {
    return {
      ok: false,
      id,
      sent: 0,
      failed: 0,
      skipped: 0,
      error: "Campaign is already sending.",
    };
  }
  if (existing.status === "sent") {
    return {
      ok: false,
      id,
      sent: existing.sendCount,
      failed: 0,
      skipped: 0,
      error: "Campaign already sent.",
    };
  }
  if (existing.status === "cancelled") {
    return {
      ok: false,
      id,
      sent: 0,
      failed: 0,
      skipped: 0,
      error: "Campaign was cancelled.",
    };
  }

  const claimed = await claimCampaignForSend(id);
  if (!claimed) {
    return {
      ok: false,
      id,
      sent: 0,
      failed: 0,
      skipped: 0,
      error: "Could not claim campaign for send (already claimed?).",
    };
  }

  const audienceResult = await resolveAudience(claimed);
  if (!audienceResult.ok) {
    await saveCampaign({
      ...claimed,
      status: "failed",
      lastError: audienceResult.error,
      errorCount: (claimed.errorCount ?? 0) + 1,
    });
    return {
      ok: false,
      id,
      sent: 0,
      failed: 0,
      skipped: 0,
      error: audienceResult.error,
    };
  }

  try {
    let sent = 0;
    let failed = 0;
    let skipped = 0;
    let error: string | undefined;

    if (claimed.channel === "whatsapp") {
      const wa = await dispatchWhatsApp(claimed, audienceResult.audience);
      sent = wa.sent;
      failed = wa.failed;
      skipped = wa.skipped;
      error = wa.error;
    } else {
      const email = await sendCampaignEmailBatch({
        campaign: claimed,
        recipients: audienceResult.audience,
      });
      sent = email.sent;
      failed = email.failed;
      error = email.error;
      if (!email.ok && email.sent === 0) {
        await saveCampaign({
          ...claimed,
          status: "failed",
          sendCount: 0,
          errorCount: failed,
          lastError: error ?? "Email send failed.",
        });
        return { ok: false, id, sent, failed, skipped, error };
      }
    }

    if (error && sent === 0 && failed === 0 && skipped === 0) {
      await saveCampaign({
        ...claimed,
        status: "failed",
        lastError: error,
        errorCount: (claimed.errorCount ?? 0) + 1,
      });
      return { ok: false, id, sent, failed, skipped, error };
    }

    if (sent === 0 && claimed.channel === "whatsapp" && claimed.waMode === "interactive") {
      await saveCampaign({
        ...claimed,
        status: "failed",
        sendCount: 0,
        errorCount: failed,
        lastError:
          skipped > 0
            ? `No recipients inside the 24h window (${skipped} skipped).`
            : (error ?? "No messages sent."),
      });
      return {
        ok: false,
        id,
        sent,
        failed,
        skipped,
        error:
          skipped > 0
            ? `No recipients inside the 24h window (${skipped} skipped).`
            : error,
      };
    }

    const now = new Date().toISOString();
    await saveCampaign({
      ...claimed,
      status: sent > 0 ? "sent" : "failed",
      sentAt: sent > 0 ? now : null,
      sendCount: sent,
      errorCount: failed,
      lastError:
        failed > 0 || skipped > 0
          ? [
              failed > 0 ? `${failed} failed` : null,
              skipped > 0 ? `${skipped} skipped (outside 24h window)` : null,
              error,
            ]
              .filter(Boolean)
              .join(" · ")
          : null,
    });

    return {
      ok: sent > 0,
      id,
      sent,
      failed,
      skipped,
      error: sent > 0 ? undefined : error,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Send failed.";
    await saveCampaign({
      ...claimed,
      status: "failed",
      lastError: message,
      errorCount: (claimed.errorCount ?? 0) + 1,
    });
    return { ok: false, id, sent: 0, failed: 0, skipped: 0, error: message };
  }
}

/** Process all due scheduled campaigns (cron worker). */
export async function dispatchDueCampaigns(): Promise<{
  processed: number;
  results: DispatchResult[];
}> {
  const due = await listDueCampaigns();
  const results: DispatchResult[] = [];
  for (const campaign of due) {
    results.push(await dispatchCampaign(campaign.id));
  }
  return { processed: results.length, results };
}

import type { EmailBlock } from "@/lib/email-blocks";

export type CampaignChannel = "whatsapp" | "email";
export type CampaignStatus =
  | "draft"
  | "scheduled"
  | "sending"
  | "sent"
  | "failed"
  | "cancelled";
export type CampaignWaMode = "template" | "interactive";

export type Campaign = {
  id: string;
  name: string;
  channel: CampaignChannel;
  status: CampaignStatus;
  segmentId: string | null;
  scheduledAt: string | null;
  /** WhatsApp only */
  waMode: CampaignWaMode | null;
  waDesignId: string | null;
  /** Email only — optional library template this campaign was loaded from */
  emailTemplateId: string | null;
  /** Email only — inline design snapshot (reuses email block editor) */
  emailSubject: string | null;
  emailAccentColor: string | null;
  emailBlocks: EmailBlock[] | null;
  /** Populated after a send attempt */
  sentAt: string | null;
  sendCount: number;
  errorCount: number;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
};

export function newCampaignId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `camp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function emptyCampaign(partial?: Partial<Campaign>): Campaign {
  const now = new Date().toISOString();
  return {
    id: partial?.id ?? newCampaignId(),
    name: partial?.name ?? "Untitled campaign",
    channel: partial?.channel ?? "whatsapp",
    status: partial?.status ?? "draft",
    segmentId: partial?.segmentId ?? null,
    scheduledAt: partial?.scheduledAt ?? null,
    waMode: partial?.waMode ?? "template",
    waDesignId: partial?.waDesignId ?? null,
    emailTemplateId: partial?.emailTemplateId ?? null,
    emailSubject: partial?.emailSubject ?? null,
    emailAccentColor: partial?.emailAccentColor ?? "#6f2c3f",
    emailBlocks: partial?.emailBlocks ?? null,
    sentAt: partial?.sentAt ?? null,
    sendCount: partial?.sendCount ?? 0,
    errorCount: partial?.errorCount ?? 0,
    lastError: partial?.lastError ?? null,
    createdAt: partial?.createdAt ?? now,
    updatedAt: partial?.updatedAt ?? now,
  };
}

export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  sending: "Sending",
  sent: "Sent",
  failed: "Failed",
  cancelled: "Cancelled",
};

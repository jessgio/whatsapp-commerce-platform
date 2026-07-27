"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/guard";
import {
  deleteCampaign,
  getCampaign,
  saveCampaign,
} from "@/lib/data/campaigns";
import { dispatchCampaign } from "@/lib/campaign-dispatch";
import {
  emptyCampaign,
  type Campaign,
  type CampaignChannel,
  type CampaignStatus,
  type CampaignWaMode,
} from "@/lib/campaigns";
import { isEmailBlock, type EmailBlock } from "@/lib/email-blocks";

export type CampaignActionState = {
  ok: boolean;
  error?: string;
  id?: string;
  sent?: number;
  failed?: number;
  skipped?: number;
};

export type CampaignSaveInput = {
  id?: string;
  name: string;
  channel: CampaignChannel;
  status?: CampaignStatus;
  segmentId: string | null;
  scheduledAt: string | null;
  waMode: CampaignWaMode | null;
  waDesignId: string | null;
  emailTemplateId: string | null;
  emailSubject: string | null;
  emailAccentColor: string | null;
  emailBlocks: EmailBlock[] | null;
};

export async function saveCampaignAction(
  input: CampaignSaveInput,
): Promise<CampaignActionState> {
  await requirePermission("marketing.edit");

  const name = input.name.trim();
  if (!name) return { ok: false, error: "Campaign name is required." };

  if (input.channel === "whatsapp") {
    if (!input.waMode || !input.waDesignId) {
      return {
        ok: false,
        error: "Choose a WhatsApp design mode and design.",
      };
    }
  }

  if (input.channel === "email") {
    if (!input.emailSubject?.trim()) {
      return { ok: false, error: "Email subject is required." };
    }
    if (
      input.emailBlocks &&
      (!Array.isArray(input.emailBlocks) ||
        !input.emailBlocks.every(isEmailBlock))
    ) {
      return { ok: false, error: "Invalid email blocks." };
    }
  }

  const existing = input.id ? await getCampaign(input.id) : null;
  const base = existing ?? emptyCampaign({ id: input.id });

  const next: Campaign = {
    ...base,
    name,
    channel: input.channel,
    status: input.status ?? base.status,
    segmentId: input.segmentId,
    scheduledAt: input.scheduledAt,
    waMode: input.channel === "whatsapp" ? input.waMode : null,
    waDesignId: input.channel === "whatsapp" ? input.waDesignId : null,
    emailTemplateId:
      input.channel === "email" ? input.emailTemplateId : null,
    emailSubject: input.channel === "email" ? input.emailSubject : null,
    emailAccentColor:
      input.channel === "email" ? input.emailAccentColor : null,
    emailBlocks: input.channel === "email" ? input.emailBlocks : null,
  };

  try {
    const saved = await saveCampaign(next);
    revalidatePath("/marketing/campaigns");
    revalidatePath(`/marketing/campaigns/${saved.id}`);
    return { ok: true, id: saved.id };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to save campaign.",
    };
  }
}

export async function scheduleCampaignAction(
  id: string,
  scheduledAt: string,
): Promise<CampaignActionState> {
  await requirePermission("marketing.send");
  const campaign = await getCampaign(id);
  if (!campaign) return { ok: false, error: "Campaign not found." };
  if (!scheduledAt) return { ok: false, error: "Pick a schedule date and time." };
  if (!campaign.segmentId) {
    return { ok: false, error: "Select a customer segment first." };
  }
  if (campaign.channel === "whatsapp" && !campaign.waDesignId) {
    return { ok: false, error: "Choose a WhatsApp message design first." };
  }
  if (campaign.channel === "email" && !campaign.emailSubject?.trim()) {
    return { ok: false, error: "Save an email subject/design first." };
  }

  try {
    await saveCampaign({
      ...campaign,
      scheduledAt,
      status: "scheduled",
      lastError: null,
    });
    revalidatePath("/marketing/campaigns");
    revalidatePath(`/marketing/campaigns/${id}`);
    return { ok: true, id };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to schedule campaign.",
    };
  }
}

export async function sendCampaignAction(
  id: string,
): Promise<CampaignActionState> {
  await requirePermission("marketing.send");
  const result = await dispatchCampaign(id);
  revalidatePath("/marketing/campaigns");
  revalidatePath(`/marketing/campaigns/${id}`);
  return {
    ok: result.ok,
    id: result.id,
    error: result.error,
    sent: result.sent,
    failed: result.failed,
    skipped: result.skipped,
  };
}

export async function deleteCampaignAction(
  id: string,
): Promise<CampaignActionState> {
  await requirePermission("marketing.edit");
  try {
    await deleteCampaign(id);
    revalidatePath("/marketing/campaigns");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to delete campaign.",
    };
  }
}

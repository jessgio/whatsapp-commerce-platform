import "server-only";
import { isSupabaseConfigured } from "@/lib/env";
import {
  emptyCampaign,
  type Campaign,
  type CampaignChannel,
  type CampaignStatus,
  type CampaignWaMode,
} from "@/lib/campaigns";
import { isEmailBlock, type EmailBlock } from "@/lib/email-blocks";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

let demoCampaigns: Campaign[] = [
  emptyCampaign({
    id: "camp-demo-wa",
    name: "VIP weekend offer",
    channel: "whatsapp",
    status: "draft",
    segmentId: "seg-demo-vip",
    waMode: "template",
    waDesignId: "wa-tpl-demo-offer",
  }),
  emptyCampaign({
    id: "camp-demo-email",
    name: "Reorder nurture email",
    channel: "email",
    status: "draft",
    segmentId: "seg-demo-recent",
    emailSubject: "Masih ingat Glow Serum, {name}?",
    emailAccentColor: "#6f2c3f",
    emailBlocks: null,
  }),
];

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapCampaign(r: any): Campaign {
  const blocks = Array.isArray(r.email_blocks)
    ? (r.email_blocks as unknown[]).filter(isEmailBlock)
    : null;
  return {
    id: r.id,
    name: r.name,
    channel: r.channel as CampaignChannel,
    status: r.status as CampaignStatus,
    segmentId: r.segment_id ?? null,
    scheduledAt: r.scheduled_at ?? null,
    waMode: (r.wa_mode as CampaignWaMode | null) ?? null,
    waDesignId: r.wa_design_id ?? null,
    emailTemplateId: r.email_template_id ?? null,
    emailSubject: r.email_subject ?? null,
    emailAccentColor: r.email_accent_color ?? null,
    emailBlocks: blocks && blocks.length ? (blocks as EmailBlock[]) : null,
    sentAt: r.sent_at ?? null,
    sendCount: Number(r.send_count ?? 0),
    errorCount: Number(r.error_count ?? 0),
    lastError: r.last_error ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function toRow(next: Campaign, now: string) {
  return {
    id: next.id,
    name: next.name,
    channel: next.channel,
    status: next.status,
    segment_id: next.segmentId,
    scheduled_at: next.scheduledAt,
    wa_mode: next.waMode,
    wa_design_id: next.waDesignId,
    email_template_id: next.emailTemplateId,
    email_subject: next.emailSubject,
    email_accent_color: next.emailAccentColor,
    email_blocks: next.emailBlocks,
    sent_at: next.sentAt,
    send_count: next.sendCount,
    error_count: next.errorCount,
    last_error: next.lastError,
    updated_at: now,
    created_at: next.createdAt,
  };
}

export async function listCampaigns(): Promise<Campaign[]> {
  if (!isSupabaseConfigured()) {
    return demoCampaigns.slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  // Admin client so cron + portal share one path (pages already gate with RBAC).
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) {
    console.error("[campaigns] list failed", error);
    return [];
  }
  return (data ?? []).map(mapCampaign);
}

export async function getCampaign(id: string): Promise<Campaign | null> {
  if (!isSupabaseConfigured()) {
    return demoCampaigns.find((c) => c.id === id) ?? null;
  }
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("[campaigns] get failed", error);
    return null;
  }
  return data ? mapCampaign(data) : null;
}

export async function saveCampaign(input: Campaign): Promise<Campaign> {
  const now = new Date().toISOString();
  const next: Campaign = { ...input, updatedAt: now };

  if (!isSupabaseConfigured()) {
    const idx = demoCampaigns.findIndex((c) => c.id === next.id);
    if (idx >= 0) demoCampaigns[idx] = next;
    else demoCampaigns = [next, ...demoCampaigns];
    return { ...next, emailBlocks: next.emailBlocks ? [...next.emailBlocks] : null };
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("campaigns")
    .upsert(toRow(next, now), { onConflict: "id" })
    .select("*")
    .single();
  if (error || !data) {
    console.error("[campaigns] save failed", error);
    throw new Error(error?.message ?? "Failed to save campaign");
  }
  return mapCampaign(data);
}

/** Campaigns due for the schedule worker. */
export async function listDueCampaigns(now = new Date()): Promise<Campaign[]> {
  const iso = now.toISOString();
  if (!isSupabaseConfigured()) {
    return demoCampaigns.filter(
      (c) =>
        c.status === "scheduled" &&
        c.scheduledAt != null &&
        c.scheduledAt <= iso,
    );
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("status", "scheduled")
    .lte("scheduled_at", iso)
    .order("scheduled_at", { ascending: true })
    .limit(25);

  if (error) {
    console.error("[campaigns] listDue failed", error);
    return [];
  }
  return (data ?? []).map(mapCampaign);
}

/**
 * Atomically move draft/scheduled → sending. Returns null if another worker
 * already claimed it.
 */
export async function claimCampaignForSend(
  id: string,
): Promise<Campaign | null> {
  const now = new Date().toISOString();

  if (!isSupabaseConfigured()) {
    const camp = demoCampaigns.find((c) => c.id === id);
    if (!camp) return null;
    if (camp.status !== "draft" && camp.status !== "scheduled" && camp.status !== "failed") {
      return null;
    }
    const next = { ...camp, status: "sending" as const, updatedAt: now, lastError: null };
    const idx = demoCampaigns.findIndex((c) => c.id === id);
    demoCampaigns[idx] = next;
    return { ...next };
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("campaigns")
    .update({ status: "sending", updated_at: now, last_error: null })
    .eq("id", id)
    .in("status", ["draft", "scheduled", "failed"])
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("[campaigns] claim failed", error);
    return null;
  }
  return data ? mapCampaign(data) : null;
}

export async function deleteCampaign(id: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    demoCampaigns = demoCampaigns.filter((c) => c.id !== id);
    return;
  }
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("campaigns").delete().eq("id", id);
  if (error) {
    console.error("[campaigns] delete failed", error);
    throw new Error(error.message);
  }
}

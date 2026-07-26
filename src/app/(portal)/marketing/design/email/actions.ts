"use server";

import { revalidatePath } from "next/cache";
import { saveLeadWelcomeTemplate } from "@/lib/data/email-templates";
import { isEmailBlock, type EmailBlock } from "@/lib/email-blocks";
import { requirePermission } from "@/lib/guard";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export type SaveEmailTemplateState = {
  ok: boolean;
  error?: string;
};

export async function saveLeadWelcomeEmailAction(input: {
  subject: string;
  accentColor: string;
  blocks: EmailBlock[];
}): Promise<SaveEmailTemplateState> {
  await requirePermission("marketing.edit");

  const accentColor = input.accentColor.trim() || "#6f2c3f";
  if (!/^#[0-9A-Fa-f]{6}$/.test(accentColor)) {
    return { ok: false, error: "Accent color must be a hex value like #6f2c3f." };
  }

  const subject = input.subject.trim();
  if (!subject) {
    return { ok: false, error: "Subject line is required." };
  }

  if (!Array.isArray(input.blocks) || !input.blocks.every(isEmailBlock)) {
    return { ok: false, error: "Invalid email blocks." };
  }

  try {
    await saveLeadWelcomeTemplate({
      subject,
      accentColor,
      blocks: input.blocks,
    });
    revalidatePath("/marketing/design/email");
    revalidatePath("/marketing/design");
    revalidatePath("/settings/emails");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to save template.",
    };
  }
}

export type EmailAssetUploadSlot = {
  ok: boolean;
  path?: string;
  token?: string;
  signedUrl?: string;
  publicUrl?: string;
  demo?: boolean;
  error?: string;
};

const MAX_BYTES = 35 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function guessMime(filename: string, contentType: string): string {
  if (contentType && contentType !== "application/octet-stream") return contentType;
  const lower = filename.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  return "";
}

export async function createEmailAssetUploadSlotAction(input: {
  filename: string;
  contentType: string;
  size: number;
}): Promise<EmailAssetUploadSlot> {
  try {
    await requirePermission("marketing.edit");

    const mime = guessMime(input.filename || "upload.bin", input.contentType || "");
    if (!ALLOWED.includes(mime)) {
      return { ok: false, error: "Use JPG, PNG, WebP, or GIF." };
    }
    if (!input.size || input.size <= 0) {
      return { ok: false, error: "Choose an image file to upload." };
    }
    if (input.size > MAX_BYTES) {
      return { ok: false, error: "Image must be 35 MB or smaller." };
    }

    if (!isSupabaseConfigured()) {
      return { ok: true, demo: true };
    }

    const ext =
      mime === "image/png"
        ? "png"
        : mime === "image/webp"
          ? "webp"
          : mime === "image/gif"
            ? "gif"
            : "jpg";
    const path = `lead-welcome/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.storage
      .from("email-assets")
      .createSignedUploadUrl(path);

    if (error || !data) {
      console.error("[email-assets] signed url failed", error);
      return {
        ok: false,
        error: error?.message ?? "Could not create upload URL.",
      };
    }

    const { data: pub } = supabase.storage.from("email-assets").getPublicUrl(path);
    return {
      ok: true,
      path: data.path,
      token: data.token,
      signedUrl: data.signedUrl,
      publicUrl: pub.publicUrl,
    };
  } catch (e) {
    console.error("[email-assets] signed url exception", e);
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not start upload.",
    };
  }
}

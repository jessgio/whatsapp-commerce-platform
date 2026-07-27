"use server";

import { revalidatePath } from "next/cache";
import {
  deleteEmailTemplate,
  getEmailTemplate,
  saveEmailTemplate,
  saveLeadWelcomeTemplate,
} from "@/lib/data/email-templates";
import {
  deleteEmailFont,
  listEmailFonts,
  saveEmailFont,
} from "@/lib/data/email-fonts";
import { isEmailBlock, type EmailBlock } from "@/lib/email-blocks";
import {
  detectFontFormat,
  sanitizeCssFamily,
  type EmailCustomFont,
  type EmailFontFile,
} from "@/lib/email-fonts";
import {
  LEAD_WELCOME_TEMPLATE_ID,
  emptyCampaignEmailTemplate,
  type EmailTemplate,
} from "@/lib/email-templates";
import type { BuiltinEmailFont } from "@/lib/email-style";
import { requirePermission } from "@/lib/guard";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export type SaveEmailTemplateState = {
  ok: boolean;
  error?: string;
  id?: string;
};

function revalidateEmailPaths(id?: string) {
  revalidatePath("/marketing/design");
  revalidatePath("/marketing/design/email");
  revalidatePath("/marketing/design/email/fonts");
  if (id) revalidatePath(`/marketing/design/email/${id}`);
  revalidatePath("/settings/emails");
}

export async function saveLeadWelcomeEmailAction(input: {
  subject: string;
  accentColor: string;
  blocks: EmailBlock[];
  name?: string;
}): Promise<SaveEmailTemplateState> {
  await requirePermission("marketing.edit");

  const accentColor = input.accentColor.trim() || "#6f2c3f";
  if (!/^#[0-9A-Fa-f]{6}$/.test(accentColor)) {
    return { ok: false, error: "Accent color must be a hex value like #6f2c3f." };
  }
  const subject = input.subject.trim();
  if (!subject) return { ok: false, error: "Subject line is required." };
  if (!Array.isArray(input.blocks) || !input.blocks.every(isEmailBlock)) {
    return { ok: false, error: "Invalid email blocks." };
  }

  try {
    await saveLeadWelcomeTemplate({
      subject,
      accentColor,
      blocks: input.blocks,
      name: input.name,
    });
    revalidateEmailPaths(LEAD_WELCOME_TEMPLATE_ID);
    return { ok: true, id: LEAD_WELCOME_TEMPLATE_ID };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to save template.",
    };
  }
}

export async function saveEmailTemplateAction(input: {
  id: string;
  name: string;
  subject: string;
  accentColor: string;
  blocks: EmailBlock[];
  description?: string | null;
}): Promise<SaveEmailTemplateState> {
  await requirePermission("marketing.edit");

  const accentColor = input.accentColor.trim() || "#6f2c3f";
  if (!/^#[0-9A-Fa-f]{6}$/.test(accentColor)) {
    return { ok: false, error: "Accent color must be a hex value like #6f2c3f." };
  }
  const subject = input.subject.trim();
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Template name is required." };
  if (!subject) return { ok: false, error: "Subject line is required." };
  if (!Array.isArray(input.blocks) || !input.blocks.every(isEmailBlock)) {
    return { ok: false, error: "Invalid email blocks." };
  }

  try {
    const existing = await getEmailTemplate(input.id);
    const base: EmailTemplate =
      existing ??
      emptyCampaignEmailTemplate({
        id: input.id,
        name,
        subject,
        accentColor,
        blocks: input.blocks,
      });

    await saveEmailTemplate({
      ...base,
      name,
      description: input.description ?? base.description,
      subject,
      accentColor,
      blocks: input.blocks,
    });
    revalidateEmailPaths(input.id);
    return { ok: true, id: input.id };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to save template.",
    };
  }
}

export async function createEmailTemplateAction(input?: {
  name?: string;
}): Promise<SaveEmailTemplateState> {
  await requirePermission("marketing.edit");
  try {
    const template = emptyCampaignEmailTemplate({
      name: input?.name?.trim() || "Untitled email",
    });
    await saveEmailTemplate(template);
    revalidateEmailPaths(template.id);
    return { ok: true, id: template.id };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to create template.",
    };
  }
}

export async function deleteEmailTemplateAction(
  id: string,
): Promise<SaveEmailTemplateState> {
  await requirePermission("marketing.edit");
  try {
    await deleteEmailTemplate(id);
    revalidateEmailPaths();
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to delete template.",
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

const MAX_IMAGE_BYTES = 35 * 1024 * 1024;
const ALLOWED_IMAGES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function guessImageMime(filename: string, contentType: string): string {
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

    const mime = guessImageMime(input.filename || "upload.bin", input.contentType || "");
    if (!ALLOWED_IMAGES.includes(mime)) {
      return { ok: false, error: "Use JPG, PNG, WebP, or GIF." };
    }
    if (!input.size || input.size <= 0) {
      return { ok: false, error: "Choose an image file to upload." };
    }
    if (input.size > MAX_IMAGE_BYTES) {
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
    const path = `design/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

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

/* ---------- Custom fonts ---------- */

const MAX_FONT_BYTES = 5 * 1024 * 1024;

export async function createEmailFontUploadSlotAction(input: {
  filename: string;
  contentType: string;
  size: number;
}): Promise<EmailAssetUploadSlot & { format?: string }> {
  try {
    await requirePermission("marketing.edit");
    const format = detectFontFormat(
      input.filename || "",
      input.contentType || "",
    );
    if (!format) {
      return { ok: false, error: "Use WOFF2, WOFF, TTF, or OTF font files." };
    }
    if (!input.size || input.size <= 0) {
      return { ok: false, error: "Choose a font file to upload." };
    }
    if (input.size > MAX_FONT_BYTES) {
      return { ok: false, error: "Font file must be 5 MB or smaller." };
    }

    if (!isSupabaseConfigured()) {
      return { ok: true, demo: true, format };
    }

    const ext =
      format === "woff2"
        ? "woff2"
        : format === "woff"
          ? "woff"
          : format === "opentype"
            ? "otf"
            : "ttf";
    const path = `brand/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.storage
      .from("email-fonts")
      .createSignedUploadUrl(path);

    if (error || !data) {
      console.error("[email-fonts] signed url failed", error);
      return {
        ok: false,
        error: error?.message ?? "Could not create upload URL.",
      };
    }
    const { data: pub } = supabase.storage.from("email-fonts").getPublicUrl(path);
    return {
      ok: true,
      path: data.path,
      token: data.token,
      signedUrl: data.signedUrl,
      publicUrl: pub.publicUrl,
      format,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not start font upload.",
    };
  }
}

export async function saveEmailFontAction(input: {
  id?: string;
  name: string;
  cssFamily?: string;
  fallback?: BuiltinEmailFont;
  files: EmailFontFile[];
}): Promise<{ ok: boolean; error?: string; font?: EmailCustomFont }> {
  await requirePermission("marketing.edit");
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Font name is required." };
  if (!input.files.length) {
    return { ok: false, error: "Upload at least one font file." };
  }

  const now = new Date().toISOString();
  const id =
    input.id ??
    (typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `font-${Date.now().toString(36)}`);

  const existing = (await listEmailFonts()).find((f) => f.id === id);
  const font: EmailCustomFont = {
    id,
    name,
    cssFamily: sanitizeCssFamily(input.cssFamily || name),
    fallback: input.fallback ?? "sans",
    files: input.files,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  try {
    const saved = await saveEmailFont(font);
    revalidateEmailPaths();
    return { ok: true, font: saved };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to save font.",
    };
  }
}

export async function deleteEmailFontAction(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  await requirePermission("marketing.edit");
  try {
    await deleteEmailFont(id);
    revalidateEmailPaths();
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to delete font.",
    };
  }
}

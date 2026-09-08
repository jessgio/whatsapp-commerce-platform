"use server";

import { revalidatePath } from "next/cache";
import { isEmailBlock, type EmailBlock } from "@/lib/email-blocks";
import {
  deleteFormTemplate,
  getFormTemplate,
  saveFormTemplate,
} from "@/lib/data/form-templates";
import {
  QR_LEAD_FORM_TEMPLATE_ID,
  emptyLibraryFormTemplate,
  validateFormFields,
  type FormField,
  type FormPageCopy,
  type FormTemplate,
  type FormThankYou,
} from "@/lib/form-templates";
import { requirePermission } from "@/lib/guard";
import { jakartaEndOfDayIso, jakartaPlusDays } from "@/lib/digital-form";

export type SaveFormTemplateState = {
  ok: boolean;
  error?: string;
  id?: string;
};

function revalidateFormPaths(id?: string, slug?: string | null) {
  revalidatePath("/marketing/design");
  revalidatePath("/marketing/design/form");
  if (id) revalidatePath(`/marketing/design/form/${id}`);
  revalidatePath("/daftar");
  revalidatePath("/daftar/terima-kasih");
  if (slug) {
    revalidatePath(`/f/${slug}`);
    revalidatePath(`/f/${slug}/terima-kasih`);
  }
}

export async function saveFormTemplateAction(input: {
  id: string;
  name: string;
  formPage: FormPageCopy;
  fields: FormField[];
  thankYou: FormThankYou;
  discountCode: string;
  isPublished?: boolean;
  expiresAt?: string | null;
}): Promise<SaveFormTemplateState> {
  await requirePermission("marketing.edit");

  const name = input.name.trim();
  if (!name) return { ok: false, error: "Template name is required." };

  const fieldError = validateFormFields(input.fields);
  if (fieldError) return { ok: false, error: fieldError };

  if (
    !input.thankYou?.blocks ||
    !Array.isArray(input.thankYou.blocks) ||
    !input.thankYou.blocks.every(isEmailBlock)
  ) {
    return { ok: false, error: "Invalid thank-you page blocks." };
  }

  const accent = input.thankYou.accentColor?.trim() || "#6f2c3f";
  if (!/^#[0-9A-Fa-f]{6}$/.test(accent)) {
    return { ok: false, error: "Accent color must be a hex value like #6f2c3f." };
  }

  const discountCode = input.discountCode.trim() || "AERIS15";

  try {
    const existing = await getFormTemplate(input.id);
    const base: FormTemplate =
      existing ??
      emptyLibraryFormTemplate({ id: input.id, name });

    const saved = await saveFormTemplate({
      ...base,
      name,
      isPublished:
        input.id === QR_LEAD_FORM_TEMPLATE_ID
          ? true
          : (input.isPublished ?? base.isPublished),
      formPage: {
        brandTitle: input.formPage.brandTitle.trim() || "Aeris Beauté",
        eyebrow: input.formPage.eyebrow.trim() || "Formulir",
        headline: input.formPage.headline.trim() || "Lengkapi data Anda",
        intro: input.formPage.intro.trim(),
        submitLabel: input.formPage.submitLabel.trim() || "Kirim",
      },
      fields: input.fields,
      thankYou: {
        accentColor: accent,
        pageBg: input.thankYou.pageBg ?? null,
        blocks: input.thankYou.blocks as EmailBlock[],
      },
      discountCode,
      expiresAt:
        input.id === QR_LEAD_FORM_TEMPLATE_ID
          ? null
          : (input.expiresAt !== undefined ? input.expiresAt : base.expiresAt),
    });
    revalidateFormPaths(input.id, saved.publicSlug);
    return { ok: true, id: input.id };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to save form template.",
    };
  }
}

/** Save form page + fields without touching thank-you blocks. */
export async function saveFormFieldsAction(input: {
  id: string;
  name: string;
  formPage: FormPageCopy;
  fields: FormField[];
  discountCode: string;
  isPublished?: boolean;
  expiresAt?: string | null;
}): Promise<SaveFormTemplateState> {
  await requirePermission("marketing.edit");
  const existing = await getFormTemplate(input.id);
  if (!existing) return { ok: false, error: "Form template not found." };

  return saveFormTemplateAction({
    id: existing.id,
    name: input.name,
    formPage: input.formPage,
    fields: input.fields,
    thankYou: existing.thankYou,
    discountCode: input.discountCode,
    isPublished: input.isPublished ?? existing.isPublished,
    expiresAt: input.expiresAt !== undefined ? input.expiresAt : existing.expiresAt,
  });
}

/** Save only thank-you blocks — shape matches EmailTemplateEditor onSave. */
export async function saveFormThankYouAction(input: {
  id: string;
  name: string;
  subject: string;
  accentColor: string;
  blocks: EmailBlock[];
  description?: string | null;
}): Promise<SaveFormTemplateState> {
  await requirePermission("marketing.edit");
  const existing = await getFormTemplate(input.id);
  if (!existing) return { ok: false, error: "Form template not found." };

  return saveFormTemplateAction({
    id: existing.id,
    name: existing.name,
    formPage: existing.formPage,
    fields: existing.fields,
    thankYou: {
      accentColor: input.accentColor,
      pageBg: existing.thankYou.pageBg,
      blocks: input.blocks,
    },
    discountCode: existing.discountCode,
    isPublished: existing.isPublished,
  });
}

export async function createFormTemplateAction(input?: {
  name?: string;
  variant?: "basic" | "exp";
}): Promise<SaveFormTemplateState> {
  await requirePermission("marketing.edit");
  const variant = input?.variant === "exp" ? "exp" : "basic";
  const expiresAt =
    variant === "exp" ? jakartaEndOfDayIso(jakartaPlusDays(30)) : null;
  try {
    const template = emptyLibraryFormTemplate({
      name:
        input?.name?.trim() ||
        (variant === "exp" ? "Exp form" : "Basic form"),
      expiresAt,
    });
    await saveFormTemplate(template);
    revalidateFormPaths(template.id, template.publicSlug);
    return { ok: true, id: template.id };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to create form template.",
    };
  }
}

export async function deleteFormTemplateAction(
  id: string,
): Promise<SaveFormTemplateState> {
  await requirePermission("marketing.edit");
  try {
    const existing = await getFormTemplate(id);
    await deleteFormTemplate(id);
    revalidateFormPaths(id, existing?.publicSlug);
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to delete form template.",
    };
  }
}

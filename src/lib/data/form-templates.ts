import "server-only";
import { isSupabaseConfigured } from "@/lib/env";
import {
  DEFAULT_QR_LEAD_TEMPLATE,
  QR_LEAD_FORM_TEMPLATE_ID,
  cloneFormTemplate,
  mapFormTemplate,
  type FormTemplate,
} from "@/lib/form-templates";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

let demoTemplates: FormTemplate[] = [cloneFormTemplate(DEFAULT_QR_LEAD_TEMPLATE)];

function ensureQrLead(list: FormTemplate[]): FormTemplate[] {
  if (list.some((t) => t.id === QR_LEAD_FORM_TEMPLATE_ID)) return list;
  return [cloneFormTemplate(DEFAULT_QR_LEAD_TEMPLATE), ...list];
}

export async function listFormTemplates(): Promise<FormTemplate[]> {
  if (!isSupabaseConfigured()) {
    return demoTemplates
      .slice()
      .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("form_templates")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) {
      console.error("[form_templates] list failed", {
        message: error.message,
        code: error.code,
      });
      return [cloneFormTemplate(DEFAULT_QR_LEAD_TEMPLATE)];
    }
    return ensureQrLead((data ?? []).map(mapFormTemplate));
  } catch (e) {
    console.error("[form_templates] list exception", e);
    return [cloneFormTemplate(DEFAULT_QR_LEAD_TEMPLATE)];
  }
}

export async function getFormTemplate(
  id: string,
): Promise<FormTemplate | null> {
  if (!isSupabaseConfigured()) {
    const found = demoTemplates.find((t) => t.id === id);
    if (found) return cloneFormTemplate(found);
    if (id === QR_LEAD_FORM_TEMPLATE_ID) {
      return cloneFormTemplate(DEFAULT_QR_LEAD_TEMPLATE);
    }
    return null;
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("form_templates")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) {
      console.error("[form_templates] get failed", {
        message: error.message,
        code: error.code,
      });
      if (id === QR_LEAD_FORM_TEMPLATE_ID) {
        return cloneFormTemplate(DEFAULT_QR_LEAD_TEMPLATE);
      }
      return null;
    }
    if (!data) {
      if (id === QR_LEAD_FORM_TEMPLATE_ID) {
        return cloneFormTemplate(DEFAULT_QR_LEAD_TEMPLATE);
      }
      return null;
    }
    return mapFormTemplate(data);
  } catch (e) {
    console.error("[form_templates] get exception", e);
    if (id === QR_LEAD_FORM_TEMPLATE_ID) {
      return cloneFormTemplate(DEFAULT_QR_LEAD_TEMPLATE);
    }
    return null;
  }
}

/** Public /daftar surface — always resolves to qr_lead with safe fallback. */
export async function getActiveFormTemplate(): Promise<FormTemplate> {
  const t = await getFormTemplate(QR_LEAD_FORM_TEMPLATE_ID);
  return t ?? cloneFormTemplate(DEFAULT_QR_LEAD_TEMPLATE);
}

export async function saveFormTemplate(
  input: FormTemplate,
): Promise<FormTemplate> {
  const now = new Date().toISOString();
  const kind =
    input.id === QR_LEAD_FORM_TEMPLATE_ID ? "system" : (input.kind ?? "library");
  const next: FormTemplate = {
    ...input,
    kind,
    name: input.name.trim() || "Untitled form",
    updatedAt: now,
    createdAt: input.createdAt ?? now,
  };

  if (!isSupabaseConfigured()) {
    const idx = demoTemplates.findIndex((t) => t.id === next.id);
    if (idx >= 0) demoTemplates[idx] = next;
    else demoTemplates = [next, ...demoTemplates];
    return cloneFormTemplate(next);
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("form_templates")
    .upsert(
      {
        id: next.id,
        name: next.name,
        kind: next.kind,
        is_published: next.isPublished,
        form_page: next.formPage,
        fields: next.fields,
        thank_you: next.thankYou,
        discount_code: next.discountCode,
        created_at: next.createdAt,
        updated_at: now,
      },
      { onConflict: "id" },
    )
    .select("*")
    .single();

  if (error || !data) {
    console.error("[form_templates] save failed", {
      message: error?.message,
      code: error?.code,
    });
    throw new Error(error?.message ?? "Failed to save form template");
  }
  return mapFormTemplate(data);
}

export async function deleteFormTemplate(id: string): Promise<void> {
  if (id === QR_LEAD_FORM_TEMPLATE_ID) {
    throw new Error("The QR lead form template cannot be deleted.");
  }
  if (!isSupabaseConfigured()) {
    demoTemplates = demoTemplates.filter((t) => t.id !== id);
    return;
  }
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("form_templates").delete().eq("id", id);
  if (error) {
    console.error("[form_templates] delete failed", error);
    throw new Error(error.message);
  }
}

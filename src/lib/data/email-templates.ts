import "server-only";
import { isSupabaseConfigured } from "@/lib/env";
import {
  DEFAULT_LEAD_WELCOME_TEMPLATE,
  LEAD_WELCOME_TEMPLATE_ID,
  emptyCampaignEmailTemplate,
  mapEmailTemplate,
  type EmailTemplate,
} from "@/lib/email-templates";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

let demoTemplates: EmailTemplate[] = [
  {
    ...DEFAULT_LEAD_WELCOME_TEMPLATE,
    blocks: [...DEFAULT_LEAD_WELCOME_TEMPLATE.blocks],
  },
  emptyCampaignEmailTemplate({
    id: "email-demo-reorder",
    name: "Reorder nurture",
    description: "Nudge recent buyers to restock favourites.",
    subject: "Masih ingat Glow Serum, {name}?",
  }),
];

function cloneTemplate(t: EmailTemplate): EmailTemplate {
  return { ...t, blocks: [...t.blocks] };
}

export async function listEmailTemplates(): Promise<EmailTemplate[]> {
  if (!isSupabaseConfigured()) {
    return demoTemplates
      .slice()
      .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
  }

  // Portal pages already gate with RBAC; use service role (same as campaigns).
  try {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from("email_templates")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) {
      console.error("[email_templates] list failed", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      return [cloneTemplate(DEFAULT_LEAD_WELCOME_TEMPLATE)];
    }
    return ensureLeadWelcomePresent((data ?? []).map(mapEmailTemplate));
  } catch (e) {
    console.error("[email_templates] list exception", e);
    return [cloneTemplate(DEFAULT_LEAD_WELCOME_TEMPLATE)];
  }
}

function ensureLeadWelcomePresent(list: EmailTemplate[]): EmailTemplate[] {
  if (list.some((t) => t.id === LEAD_WELCOME_TEMPLATE_ID)) return list;
  return [cloneTemplate(DEFAULT_LEAD_WELCOME_TEMPLATE), ...list];
}

export async function getEmailTemplate(
  id: string,
): Promise<EmailTemplate | null> {
  if (!isSupabaseConfigured()) {
    return demoTemplates.find((t) => t.id === id)
      ? cloneTemplate(demoTemplates.find((t) => t.id === id)!)
      : null;
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("email_templates")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("[email_templates] get failed", error);
    return null;
  }
  if (!data) {
    if (id === LEAD_WELCOME_TEMPLATE_ID) {
      return cloneTemplate(DEFAULT_LEAD_WELCOME_TEMPLATE);
    }
    return null;
  }
  return mapEmailTemplate(data);
}

export async function getLeadWelcomeTemplate(): Promise<EmailTemplate> {
  return (
    (await getEmailTemplate(LEAD_WELCOME_TEMPLATE_ID)) ??
    cloneTemplate(DEFAULT_LEAD_WELCOME_TEMPLATE)
  );
}

/** Service-role read for public lead API (no staff session). */
export async function getLeadWelcomeTemplateAdmin(): Promise<EmailTemplate> {
  if (!isSupabaseConfigured()) {
    const demo = demoTemplates.find((t) => t.id === LEAD_WELCOME_TEMPLATE_ID);
    return demo
      ? cloneTemplate(demo)
      : cloneTemplate(DEFAULT_LEAD_WELCOME_TEMPLATE);
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("email_templates")
    .select("*")
    .eq("id", LEAD_WELCOME_TEMPLATE_ID)
    .maybeSingle();

  if (error) {
    console.error("[email_templates] admin load failed", error);
    return cloneTemplate(DEFAULT_LEAD_WELCOME_TEMPLATE);
  }
  if (!data) return cloneTemplate(DEFAULT_LEAD_WELCOME_TEMPLATE);
  return mapEmailTemplate(data);
}

export async function saveEmailTemplate(
  input: EmailTemplate,
): Promise<EmailTemplate> {
  const now = new Date().toISOString();
  const kind =
    input.id === LEAD_WELCOME_TEMPLATE_ID ? "system" : (input.kind ?? "campaign");
  const next: EmailTemplate = {
    ...input,
    kind,
    name: input.name.trim() || "Untitled email",
    updatedAt: now,
  };

  if (!isSupabaseConfigured()) {
    const idx = demoTemplates.findIndex((t) => t.id === next.id);
    if (idx >= 0) demoTemplates[idx] = next;
    else demoTemplates = [next, ...demoTemplates];
    return cloneTemplate(next);
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("email_templates")
    .upsert(
      {
        id: next.id,
        name: next.name,
        description: next.description,
        kind: next.kind,
        subject: next.subject,
        brand_name: "Aeris Beauté",
        accent_color: next.accentColor,
        banner_url: null,
        greeting_template: "Hello, {name}",
        intro_text: "",
        body_text: "",
        discount_label: "Kode diskon Anda",
        show_discount: true,
        closing_text: "",
        footer_text: "© Aeris Beauté",
        blocks: next.blocks,
        updated_at: now,
      },
      { onConflict: "id" },
    )
    .select("*")
    .single();

  if (error || !data) {
    console.error("[email_templates] save failed", error);
    throw new Error(error?.message ?? "Failed to save email template");
  }

  return mapEmailTemplate(data);
}

export async function saveLeadWelcomeTemplate(input: {
  subject: string;
  accentColor: string;
  blocks: EmailTemplate["blocks"];
  name?: string;
}): Promise<EmailTemplate> {
  const existing = await getLeadWelcomeTemplate();
  return saveEmailTemplate({
    ...existing,
    id: LEAD_WELCOME_TEMPLATE_ID,
    kind: "system",
    name: input.name?.trim() || existing.name || "Lead welcome",
    subject: input.subject,
    accentColor: input.accentColor,
    blocks: input.blocks,
  });
}

export async function deleteEmailTemplate(id: string): Promise<void> {
  if (id === LEAD_WELCOME_TEMPLATE_ID) {
    throw new Error("The lead welcome template cannot be deleted.");
  }
  if (!isSupabaseConfigured()) {
    demoTemplates = demoTemplates.filter((t) => t.id !== id);
    return;
  }
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("email_templates").delete().eq("id", id);
  if (error) {
    console.error("[email_templates] delete failed", error);
    throw new Error(error.message);
  }
}

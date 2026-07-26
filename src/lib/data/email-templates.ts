import { isSupabaseConfigured } from "@/lib/env";
import {
  DEFAULT_LEAD_WELCOME_TEMPLATE,
  LEAD_WELCOME_TEMPLATE_ID,
  mapEmailTemplate,
  type EmailTemplate,
} from "@/lib/email-templates";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";

/** In-memory store for demo mode (no Supabase). */
let demoLeadWelcome: EmailTemplate = {
  ...DEFAULT_LEAD_WELCOME_TEMPLATE,
  blocks: [...DEFAULT_LEAD_WELCOME_TEMPLATE.blocks],
};

export async function getLeadWelcomeTemplate(): Promise<EmailTemplate> {
  if (!isSupabaseConfigured()) {
    return {
      ...demoLeadWelcome,
      blocks: [...demoLeadWelcome.blocks],
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("email_templates")
    .select("*")
    .eq("id", LEAD_WELCOME_TEMPLATE_ID)
    .maybeSingle();

  if (error) {
    console.error("[email_templates] load failed", error);
    return { ...DEFAULT_LEAD_WELCOME_TEMPLATE, blocks: [...DEFAULT_LEAD_WELCOME_TEMPLATE.blocks] };
  }
  if (!data) {
    return { ...DEFAULT_LEAD_WELCOME_TEMPLATE, blocks: [...DEFAULT_LEAD_WELCOME_TEMPLATE.blocks] };
  }
  return mapEmailTemplate(data);
}

/** Service-role read for public lead API (no staff session). */
export async function getLeadWelcomeTemplateAdmin(): Promise<EmailTemplate> {
  if (!isSupabaseConfigured()) {
    return {
      ...demoLeadWelcome,
      blocks: [...demoLeadWelcome.blocks],
    };
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("email_templates")
    .select("*")
    .eq("id", LEAD_WELCOME_TEMPLATE_ID)
    .maybeSingle();

  if (error) {
    console.error("[email_templates] admin load failed", error);
    return { ...DEFAULT_LEAD_WELCOME_TEMPLATE, blocks: [...DEFAULT_LEAD_WELCOME_TEMPLATE.blocks] };
  }
  if (!data) {
    return { ...DEFAULT_LEAD_WELCOME_TEMPLATE, blocks: [...DEFAULT_LEAD_WELCOME_TEMPLATE.blocks] };
  }
  return mapEmailTemplate(data);
}

export async function saveLeadWelcomeTemplate(input: {
  subject: string;
  accentColor: string;
  blocks: EmailTemplate["blocks"];
}): Promise<EmailTemplate> {
  const now = new Date().toISOString();
  const next: EmailTemplate = {
    id: LEAD_WELCOME_TEMPLATE_ID,
    subject: input.subject,
    accentColor: input.accentColor,
    blocks: input.blocks,
    updatedAt: now,
  };

  if (!isSupabaseConfigured()) {
    demoLeadWelcome = {
      ...next,
      blocks: [...next.blocks],
    };
    return { ...demoLeadWelcome, blocks: [...demoLeadWelcome.blocks] };
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("email_templates")
    .upsert(
      {
        id: LEAD_WELCOME_TEMPLATE_ID,
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

import {
  DEFAULT_LEAD_WELCOME_BLOCKS,
  legacyFieldsToBlocks,
  parseEmailBlocks,
  type EmailBlock,
} from "@/lib/email-blocks";

export const LEAD_WELCOME_TEMPLATE_ID = "lead_welcome";

export type EmailTemplateKind = "system" | "campaign";

export type EmailTemplate = {
  id: string;
  name: string;
  description: string | null;
  kind: EmailTemplateKind;
  subject: string;
  accentColor: string;
  blocks: EmailBlock[];
  updatedAt: string | null;
  /** @deprecated kept for migration/read of old rows */
  brandName?: string;
  bannerUrl?: string | null;
  greetingTemplate?: string;
  introText?: string;
  bodyText?: string;
  discountLabel?: string;
  showDiscount?: boolean;
  closingText?: string;
  footerText?: string;
};

export const DEFAULT_LEAD_WELCOME_TEMPLATE: EmailTemplate = {
  id: LEAD_WELCOME_TEMPLATE_ID,
  name: "Lead welcome",
  description: "Sent automatically to new joiners from the QR lead form.",
  kind: "system",
  subject: "Halo {name} — kode diskon Aeris Beauté",
  accentColor: "#6f2c3f",
  blocks: DEFAULT_LEAD_WELCOME_BLOCKS,
  updatedAt: null,
};

export type TemplateVars = {
  name: string;
  /** Full URL to the public “revise your info” page */
  editUrl?: string;
};

/** Replace `{name}` and `{edit_url}` placeholders. */
export function applyTemplateVars(
  template: string,
  vars: TemplateVars | string,
): string {
  const name = typeof vars === "string" ? vars : vars.name;
  const editUrl = typeof vars === "string" ? "" : (vars.editUrl ?? "");
  const firstName = name.trim().split(/\s+/)[0] || name.trim() || "friend";
  return template
    .replaceAll("{name}", firstName)
    .replaceAll("{edit_url}", editUrl);
}

export function newEmailTemplateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `email-${Date.now().toString(36)}`;
}

export function emptyCampaignEmailTemplate(
  partial?: Partial<EmailTemplate>,
): EmailTemplate {
  const now = new Date().toISOString();
  return {
    id: partial?.id ?? newEmailTemplateId(),
    name: partial?.name ?? "Untitled email",
    description: partial?.description ?? null,
    kind: "campaign",
    subject: partial?.subject ?? "Halo {name} — Aeris Beauté",
    accentColor: partial?.accentColor ?? "#6f2c3f",
    blocks: partial?.blocks
      ? [...partial.blocks]
      : [...DEFAULT_LEAD_WELCOME_BLOCKS],
    updatedAt: partial?.updatedAt ?? now,
  };
}

export function mapEmailTemplate(r: Record<string, unknown>): EmailTemplate {
  const rawBlocks = r.blocks;
  let blocks = parseEmailBlocks(rawBlocks);

  const hasLegacyCopy =
    Boolean(r.greeting_template) ||
    Boolean(r.intro_text) ||
    Boolean(r.body_text);
  if (
    (!Array.isArray(rawBlocks) || (rawBlocks as unknown[]).length === 0) &&
    hasLegacyCopy
  ) {
    blocks = legacyFieldsToBlocks({
      brandName: String(r.brand_name ?? "Aeris Beauté"),
      bannerUrl: (r.banner_url as string | null) ?? null,
      greetingTemplate: String(r.greeting_template ?? "Hello, {name}"),
      introText: String(r.intro_text ?? ""),
      bodyText: String(r.body_text ?? ""),
      discountLabel: String(r.discount_label ?? "Kode diskon Anda"),
      showDiscount: Boolean(r.show_discount ?? true),
      closingText: String(r.closing_text ?? ""),
      footerText: String(r.footer_text ?? "© Aeris Beauté"),
    });
  }

  const id = String(r.id);
  const kind: EmailTemplateKind =
    r.kind === "system" || id === LEAD_WELCOME_TEMPLATE_ID
      ? "system"
      : "campaign";

  return {
    id,
    name:
      String(r.name ?? "").trim() ||
      (id === LEAD_WELCOME_TEMPLATE_ID ? "Lead welcome" : id),
    description: (r.description as string | null) ?? null,
    kind,
    subject: String(r.subject ?? ""),
    accentColor: String(r.accent_color ?? "#6f2c3f"),
    blocks,
    updatedAt: (r.updated_at as string | null) ?? null,
  };
}

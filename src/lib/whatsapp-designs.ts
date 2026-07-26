/** WhatsApp-compliant design models for Marketing Design + Campaigns. */

export type WaTemplateCategory = "MARKETING" | "UTILITY" | "AUTHENTICATION";

export type WaTemplateHeader =
  | { type: "none" }
  | { type: "text"; text: string }
  | { type: "image"; imageUrl: string };

export type WaTemplateButton =
  | { id: string; type: "quick_reply"; text: string }
  | { id: string; type: "url"; text: string; url: string }
  | { id: string; type: "phone"; text: string; phone: string };

export type WaTemplateDesign = {
  id: string;
  name: string;
  /** Approved Meta template name used at send time */
  metaTemplateName: string;
  languageCode: string;
  category: WaTemplateCategory;
  header: WaTemplateHeader;
  body: string;
  footer: string;
  buttons: WaTemplateButton[];
  /** Preview defaults for {{1}}, {{2}}, … */
  variableDefaults: Record<string, string>;
  createdAt: string;
  updatedAt: string;
};

export type WaInteractiveKind = "text" | "image" | "reply_buttons" | "list";

export type WaReplyButton = { id: string; title: string };

export type WaListRow = {
  id: string;
  title: string;
  description?: string;
};

export type WaListSection = {
  id: string;
  title: string;
  rows: WaListRow[];
};

export type WaInteractiveDesign = {
  id: string;
  name: string;
  kind: WaInteractiveKind;
  body: string;
  headerText: string;
  footerText: string;
  imageUrl: string;
  buttons: WaReplyButton[];
  listButtonLabel: string;
  listSections: WaListSection[];
  createdAt: string;
  updatedAt: string;
};

export function newId(_prefix?: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${_prefix ?? "id"}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function defaultWaTemplateDesign(
  partial?: Partial<WaTemplateDesign>,
): WaTemplateDesign {
  const now = new Date().toISOString();
  return {
    id: partial?.id ?? newId("wa-tpl"),
    name: partial?.name ?? "Untitled template",
    metaTemplateName: partial?.metaTemplateName ?? "marketing_offer",
    languageCode: partial?.languageCode ?? "id",
    category: partial?.category ?? "MARKETING",
    header: partial?.header ?? { type: "text", text: "Aeris Beauté" },
    body:
      partial?.body ??
      "Halo {{1}}, penawaran spesial untuk Anda: {{2}}. Balas pesan ini untuk belanja.",
    footer: partial?.footer ?? "Berlaku terbatas",
    buttons: partial?.buttons ?? [
      { id: newId("btn"), type: "quick_reply", text: "Lihat penawaran" },
      {
        id: newId("btn"),
        type: "url",
        text: "Belanja sekarang",
        url: "https://aerisbeaute.com",
      },
    ],
    variableDefaults: partial?.variableDefaults ?? {
      "1": "Sari",
      "2": "diskon 15%",
    },
    createdAt: partial?.createdAt ?? now,
    updatedAt: partial?.updatedAt ?? now,
  };
}

export function defaultWaInteractiveDesign(
  partial?: Partial<WaInteractiveDesign>,
): WaInteractiveDesign {
  const now = new Date().toISOString();
  return {
    id: partial?.id ?? newId("wa-int"),
    name: partial?.name ?? "Untitled interactive",
    kind: partial?.kind ?? "reply_buttons",
    body:
      partial?.body ??
      "Halo! Mau kami bantu pilih produk yang cocok untuk kulit Anda?",
    headerText: partial?.headerText ?? "Aeris Beauté",
    footerText: partial?.footerText ?? "Balas dalam 24 jam chat window",
    imageUrl: partial?.imageUrl ?? "",
    buttons: partial?.buttons ?? [
      { id: "skin_dry", title: "Kulit kering" },
      { id: "skin_oily", title: "Kulit berminyak" },
      { id: "skin_combo", title: "Kulit kombinasi" },
    ],
    listButtonLabel: partial?.listButtonLabel ?? "Pilih opsi",
    listSections: partial?.listSections ?? [
      {
        id: newId("sec"),
        title: "Kategori",
        rows: [
          { id: "serum", title: "Serum", description: "Brightening & repair" },
          { id: "moisturizer", title: "Moisturizer", description: "Daily care" },
        ],
      },
    ],
    createdAt: partial?.createdAt ?? now,
    updatedAt: partial?.updatedAt ?? now,
  };
}

/** Extract {{n}} placeholders from body text. */
export function extractTemplateVars(body: string): string[] {
  const found = new Set<string>();
  for (const m of body.matchAll(/\{\{(\d+)\}\}/g)) {
    found.add(m[1]!);
  }
  return [...found].sort((a, b) => Number(a) - Number(b));
}

/** Apply {{n}} defaults for phone preview. */
export function applyWaVars(
  text: string,
  defaults: Record<string, string>,
): string {
  return text.replace(/\{\{(\d+)\}\}/g, (_, n: string) => defaults[n] ?? `{{${n}}}`);
}

export function isWaTemplateDesign(v: unknown): v is WaTemplateDesign {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.name === "string" &&
    typeof o.metaTemplateName === "string" &&
    typeof o.body === "string" &&
    Array.isArray(o.buttons)
  );
}

export function isWaInteractiveDesign(v: unknown): v is WaInteractiveDesign {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.name === "string" &&
    typeof o.kind === "string" &&
    typeof o.body === "string"
  );
}

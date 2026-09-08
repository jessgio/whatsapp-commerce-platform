import { isEmailBlock, newBlockId, type EmailBlock } from "@/lib/email-blocks";
import { EMAIL_BRAND_DEFAULT, EMAIL_CREAM_DEFAULT } from "@/lib/email-style";
import { LEAD_DISCOUNT_CODE } from "@/lib/lead-offer";

export const QR_LEAD_FORM_TEMPLATE_ID = "qr_lead";

export type FormTemplateKind = "system" | "library";

export type SystemFormFieldKey =
  | "name"
  | "birthDate"
  | "phone"
  | "email"
  | "city"
  | "terms";

export type FormFieldKey = SystemFormFieldKey | `custom_${string}`;

export type FormFieldType =
  | "text"
  | "date"
  | "phone"
  | "email"
  | "city"
  | "terms"
  | "textarea"
  | "select"
  | "checkbox";

export type FormFieldOption = { value: string; label: string };

export type FormField = {
  id: string;
  key: FormFieldKey;
  type: FormFieldType;
  label: string;
  placeholder?: string;
  helpText?: string;
  required: boolean;
  options?: FormFieldOption[];
  termsText?: string;
};

export type FormPageCopy = {
  brandTitle: string;
  eyebrow: string;
  headline: string;
  intro: string;
  submitLabel: string;
};

export type FormThankYou = {
  accentColor: string;
  /** Optional CSS background; default leather treatment on public page. */
  pageBg?: string | null;
  blocks: EmailBlock[];
};

export type FormTemplate = {
  id: string;
  name: string;
  kind: FormTemplateKind;
  isPublished: boolean;
  formPage: FormPageCopy;
  fields: FormField[];
  thankYou: FormThankYou;
  discountCode: string;
  /** Public share id for Form Digital (`/f/[slug]`). Null on the system QR form. */
  publicSlug: string | null;
  /** When set, the public link stops accepting traffic after this instant. */
  expiresAt: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export const REQUIRED_SYSTEM_KEYS: SystemFormFieldKey[] = [
  "name",
  "phone",
  "email",
  "terms",
];

export const OPTIONAL_SYSTEM_KEYS: SystemFormFieldKey[] = ["birthDate", "city"];

const TNC =
  "Dengan mengisi data ini, Anda menyetujui penggunaan data pribadi untuk keperluan CRM dan komunikasi dari Aeris Beauté. Kami berkomitmen menjaga kerahasiaan data Anda dan tidak akan menyalahgunakan informasi yang Anda berikan.";

export function newFormFieldId(): string {
  return `f_${Math.random().toString(36).slice(2, 10)}`;
}

export function isSystemFieldKey(key: string): key is SystemFormFieldKey {
  return (
    key === "name" ||
    key === "birthDate" ||
    key === "phone" ||
    key === "email" ||
    key === "city" ||
    key === "terms"
  );
}

export function isCustomFieldKey(key: string): key is `custom_${string}` {
  return key.startsWith("custom_");
}

export function createCustomField(
  type: "text" | "textarea" | "select" | "checkbox",
): FormField {
  const id = newFormFieldId();
  const key = `custom_${id}` as FormFieldKey;
  const base: FormField = {
    id,
    key,
    type,
    label:
      type === "textarea"
        ? "Catatan"
        : type === "select"
          ? "Pilihan"
          : type === "checkbox"
            ? "Konfirmasi"
            : "Pertanyaan",
    required: false,
  };
  if (type === "select") {
    base.options = [
      { value: "a", label: "Opsi A" },
      { value: "b", label: "Opsi B" },
    ];
  }
  if (type === "checkbox") {
    base.helpText = "Saya setuju";
  }
  return base;
}

export function createSystemField(key: SystemFormFieldKey): FormField {
  const id = `f_${key}`;
  switch (key) {
    case "name":
      return {
        id,
        key,
        type: "text",
        label: "Nama Lengkap",
        placeholder: "Sesuai kartu identitas",
        required: true,
      };
    case "birthDate":
      return {
        id,
        key,
        type: "date",
        label: "Tanggal Lahir",
        required: true,
      };
    case "phone":
      return {
        id,
        key,
        type: "phone",
        label: "Nomor Telepon",
        helpText: "Pilih kode negara, lalu isi nomor tanpa + atau kode negara.",
        required: true,
      };
    case "email":
      return {
        id,
        key,
        type: "email",
        label: "Alamat Email",
        placeholder: "nama@email.com",
        required: true,
      };
    case "city":
      return {
        id,
        key,
        type: "city",
        label: "Kota Domisili",
        required: false,
      };
    case "terms":
      return {
        id,
        key,
        type: "terms",
        label: "Privasi Data",
        termsText: TNC,
        required: true,
      };
  }
}

export const DEFAULT_QR_LEAD_FIELDS: FormField[] = [
  createSystemField("name"),
  createSystemField("birthDate"),
  createSystemField("phone"),
  createSystemField("email"),
  createSystemField("city"),
  createSystemField("terms"),
];

export const DEFAULT_QR_LEAD_FORM_PAGE: FormPageCopy = {
  brandTitle: "Aeris Beauté",
  eyebrow: "Formulir data pelanggan",
  headline: "Lengkapi data Anda",
  intro:
    "Isi formulir di bawah ini untuk mendapatkan kode diskon. Data Anda akan disimpan di sistem internal kami secara baik dan aman.",
  submitLabel: "Kirim",
};

export function defaultThankYouBlocks(): EmailBlock[] {
  return [
    {
      id: "ty_header",
      type: "header",
      brandName: "Aeris Beauté",
      showMark: false,
      logoUrl: "/images/aeris-logo-transparent.png",
      style: {
        align: "center",
        fontFamily: "sans",
        fontSize: 18,
        fontWeight: 600,
        color: EMAIL_BRAND_DEFAULT,
      },
    },
    {
      id: "ty_banner",
      type: "image",
      src: "/images/terima-kasih-banner-v2.png",
      alt: "Aeris Beauté Travel Series",
      href: "https://shopee.co.id/aerisbeaute",
      style: { align: "center", widthPercent: 100, borderRadius: 12 },
    },
    {
      id: "ty_heading",
      type: "heading",
      text: "Terima kasih!",
      style: {
        fontFamily: "sans",
        fontSize: 24,
        fontWeight: 600,
        align: "center",
        lineHeight: 1.3,
      },
    },
    {
      id: "ty_welcome",
      type: "text",
      text: "**You’re in! Welcome to Aeris!**",
      style: {
        fontFamily: "sans",
        fontSize: 16,
        fontWeight: 600,
        align: "center",
        lineHeight: 1.5,
      },
    },
    {
      id: "ty_body",
      type: "text",
      text: "Terima kasih telah menjadi bagian dari Aeris Beauté.\n\nNikmati potongan diskon 25RB dengan minimum belanja 199RB di toko [Shopee](https://shopee.co.id/aerisbeaute) resmi kami:",
      style: {
        fontFamily: "sans",
        fontSize: 14,
        fontWeight: 400,
        align: "center",
        lineHeight: 1.6,
      },
    },
    {
      id: "ty_discount",
      type: "discount",
      label: "Kode diskon Anda",
      style: {
        align: "center",
        fontFamily: "sans",
        color: "#8a7e72",
        backgroundColor: EMAIL_CREAM_DEFAULT,
        borderColor: EMAIL_BRAND_DEFAULT,
        codeColor: EMAIL_BRAND_DEFAULT,
      },
    },
    {
      id: "ty_inbox",
      type: "text",
      text: "Cek inbox (dan folder spam) jika belum melihat emailnya. Simpan atau screenshot kode ini juga.",
      style: {
        fontFamily: "sans",
        fontSize: 12,
        fontWeight: 400,
        align: "center",
        lineHeight: 1.5,
      },
    },
    {
      id: "ty_expiry",
      type: "footer",
      text: "Kode voucher berlaku hingga 30 September 2026.",
      style: {
        fontFamily: "sans",
        fontSize: 12,
        fontWeight: 400,
        align: "center",
        lineHeight: 1.5,
      },
    },
  ];
}

export const DEFAULT_QR_LEAD_TEMPLATE: FormTemplate = {
  id: QR_LEAD_FORM_TEMPLATE_ID,
  name: "QR lead form",
  kind: "system",
  isPublished: true,
  formPage: { ...DEFAULT_QR_LEAD_FORM_PAGE },
  fields: DEFAULT_QR_LEAD_FIELDS.map((f) => ({ ...f })),
  thankYou: {
    accentColor: "#6f2c3f",
    pageBg: null,
    blocks: defaultThankYouBlocks(),
  },
  discountCode: LEAD_DISCOUNT_CODE,
  publicSlug: null,
  expiresAt: null,
};

export function cloneFormTemplate(t: FormTemplate): FormTemplate {
  return {
    ...t,
    formPage: { ...t.formPage },
    fields: t.fields.map((f) => ({
      ...f,
      options: f.options?.map((o) => ({ ...o })),
    })),
    thankYou: {
      ...t.thankYou,
      blocks: t.thankYou.blocks.map((b) => ({ ...b })),
    },
  };
}

export function emptyLibraryFormTemplate(input?: {
  id?: string;
  name?: string;
  expiresAt?: string | null;
}): FormTemplate {
  const id = input?.id ?? `form_${newBlockId()}`;
  return {
    id,
    name: input?.name?.trim() || "Form Digital",
    kind: "library",
    isPublished: true,
    formPage: { ...DEFAULT_QR_LEAD_FORM_PAGE },
    fields: DEFAULT_QR_LEAD_FIELDS.map((f) => ({ ...f, id: newFormFieldId() })),
    thankYou: {
      accentColor: "#6f2c3f",
      pageBg: null,
      blocks: defaultThankYouBlocks().map((b) => ({
        ...b,
        id: newBlockId(),
      })),
    },
    discountCode: LEAD_DISCOUNT_CODE,
    publicSlug: `fd${Math.random().toString(36).slice(2, 10)}`,
    expiresAt: input?.expiresAt ?? null,
  };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function mapFormTemplate(r: any): FormTemplate {
  const formPage = (r.form_page ?? {}) as Partial<FormPageCopy>;
  const thankYou = (r.thank_you ?? {}) as Partial<FormThankYou>;
  const rawFields = Array.isArray(r.fields) ? r.fields : [];
  const rawBlocks = Array.isArray(thankYou.blocks) ? thankYou.blocks : [];

  return {
    id: String(r.id),
    name: String(r.name ?? r.id),
    kind: r.kind === "system" ? "system" : "library",
    isPublished: r.is_published !== false,
    formPage: {
      brandTitle:
        formPage.brandTitle?.trim() || DEFAULT_QR_LEAD_FORM_PAGE.brandTitle,
      eyebrow: formPage.eyebrow?.trim() || DEFAULT_QR_LEAD_FORM_PAGE.eyebrow,
      headline: formPage.headline?.trim() || DEFAULT_QR_LEAD_FORM_PAGE.headline,
      intro: formPage.intro?.trim() || DEFAULT_QR_LEAD_FORM_PAGE.intro,
      submitLabel:
        formPage.submitLabel?.trim() || DEFAULT_QR_LEAD_FORM_PAGE.submitLabel,
    },
    fields: rawFields.length
      ? rawFields.map(mapFormField).filter(Boolean) as FormField[]
      : DEFAULT_QR_LEAD_FIELDS.map((f) => ({ ...f })),
    thankYou: {
      accentColor:
        typeof thankYou.accentColor === "string" &&
        /^#[0-9A-Fa-f]{6}$/.test(thankYou.accentColor)
          ? thankYou.accentColor
          : "#6f2c3f",
      pageBg: thankYou.pageBg ?? null,
      blocks: rawBlocks.filter(isEmailBlock).length
        ? (rawBlocks.filter(isEmailBlock) as EmailBlock[])
        : defaultThankYouBlocks(),
    },
    discountCode:
      typeof r.discount_code === "string" && r.discount_code.trim()
        ? r.discount_code.trim()
        : LEAD_DISCOUNT_CODE,
    publicSlug:
      typeof r.public_slug === "string" && r.public_slug.trim()
        ? r.public_slug.trim()
        : null,
    expiresAt: r.expires_at ? String(r.expires_at) : null,
    createdAt: r.created_at ?? undefined,
    updatedAt: r.updated_at ?? undefined,
  };
}

function mapFormField(raw: any): FormField | null {
  if (!raw || typeof raw !== "object") return null;
  const key = String(raw.key ?? "");
  const type = String(raw.type ?? "") as FormFieldType;
  const id = String(raw.id ?? newFormFieldId());
  if (!key || !type) return null;
  return {
    id,
    key: key as FormFieldKey,
    type,
    label: String(raw.label ?? key),
    placeholder:
      typeof raw.placeholder === "string" ? raw.placeholder : undefined,
    helpText: typeof raw.helpText === "string" ? raw.helpText : undefined,
    required: Boolean(raw.required),
    options: Array.isArray(raw.options)
      ? raw.options
          .filter(
            (o: any) =>
              o && typeof o.value === "string" && typeof o.label === "string",
          )
          .map((o: any) => ({ value: o.value, label: o.label }))
      : undefined,
    termsText: typeof raw.termsText === "string" ? raw.termsText : undefined,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Validate field list against builder rules. Returns error message or null. */
export function validateFormFields(fields: FormField[]): string | null {
  if (!Array.isArray(fields) || fields.length === 0) {
    return "At least one form field is required.";
  }
  const keys = new Set<string>();
  for (const f of fields) {
    if (!f.id || !f.key || !f.type || !f.label?.trim()) {
      return "Each field needs an id, key, type, and label.";
    }
    if (keys.has(f.key)) return `Duplicate field key: ${f.key}`;
    keys.add(f.key);
    if (isSystemFieldKey(f.key)) {
      const expected = createSystemField(f.key).type;
      if (f.type !== expected) {
        return `System field ${f.key} must use type ${expected}.`;
      }
    } else if (!isCustomFieldKey(f.key)) {
      return `Invalid field key: ${f.key}`;
    } else if (
      f.type !== "text" &&
      f.type !== "textarea" &&
      f.type !== "select" &&
      f.type !== "checkbox"
    ) {
      return `Custom field ${f.key} has an unsupported type.`;
    }
  }
  for (const req of REQUIRED_SYSTEM_KEYS) {
    if (!keys.has(req)) {
      return `Required system field missing: ${req}`;
    }
  }
  return null;
}

export type ConsentStatus = "opted_in" | "pending" | "opted_out";
export type ConsentChannel =
  | "click_to_chat"
  | "web_form"
  | "ad"
  | "import"
  | "manual";

export interface CustomerRow {
  id: string;
  waId: string;
  name: string;
  phone: string;
  email: string | null;
  city: string | null;
  birthDate: string | null;
  consentStatus: ConsentStatus;
  consentChannel: ConsentChannel | null;
  segments: string[];
  tags: string[];
  lifetimeValue: number;
  orderCount: number;
  firstSeenAt: string;
  lastOrderAt: string | null;
  termsAcceptedAt: string | null;
  termsVersion: string | null;
  formAnswers?: Record<string, string | boolean | number | null>;
  leadDiscountCode?: string | null;
  digitalDiscountCode?: string | null;
  createdAt: string;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function mapCustomer(r: any): CustomerRow {
  return {
    id: r.id,
    waId: r.wa_id,
    name: r.name,
    phone: r.phone,
    email: r.email,
    city: r.city,
    birthDate: r.birth_date ?? null,
    consentStatus: r.consent_status ?? "pending",
    consentChannel: r.consent_channel ?? null,
    segments: r.segments ?? [],
    tags: r.tags ?? [],
    lifetimeValue: r.lifetime_value ?? 0,
    orderCount: r.order_count ?? 0,
    firstSeenAt: r.first_seen_at,
    lastOrderAt: r.last_order_at,
    termsAcceptedAt: r.terms_accepted_at ?? null,
    termsVersion: r.terms_version ?? null,
    formAnswers:
      r.form_answers &&
      typeof r.form_answers === "object" &&
      !Array.isArray(r.form_answers)
        ? r.form_answers
        : undefined,
    leadDiscountCode:
      typeof r.lead_discount_code === "string" && r.lead_discount_code.trim()
        ? r.lead_discount_code.trim()
        : null,
    digitalDiscountCode:
      typeof r.digital_discount_code === "string" &&
      r.digital_discount_code.trim()
        ? r.digital_discount_code.trim()
        : null,
    createdAt: r.created_at,
  };
}

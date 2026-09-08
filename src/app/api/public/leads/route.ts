import { NextRequest, NextResponse } from "next/server";
import { TAG_FORM_DIGITAL, TAG_VOUCHER } from "@/lib/customers/source";
import { DEMO_CUSTOMERS } from "@/lib/demo/data";
import {
  getActiveFormTemplate,
  getFormTemplateBySlug,
} from "@/lib/data/form-templates";
import { isDigitalForm, isFormExpired, isPublicSlug } from "@/lib/digital-form";
import { sendLeadWelcomeEmail } from "@/lib/email";
import { isSupabaseConfigured } from "@/lib/env";
import { newEditToken } from "@/lib/lead-edit";
import { resolveStickyLeadDiscountCode } from "@/lib/lead-offer";
import { parseLeadSubmission } from "@/lib/lead-form-submit";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { FormTemplate } from "@/lib/form-templates";
import type { Customer } from "@/lib/types";

const TERMS_VERSION = "qr_v1";
const CONSENT_NOTE =
  "QR form: accepted Privasi Data (CRM & komunikasi + kerahasiaan data).";

type LeadBody = {
  name?: string;
  birthDate?: string;
  phone?: string;
  countryCode?: string;
  email?: string;
  city?: string;
  acceptTerms?: boolean;
  values?: Record<string, unknown>;
  formSlug?: string;
};

function stampLeadTag(tags: string[], tag: string): string[] {
  return tags.includes(tag) ? tags : [...tags, tag];
}

async function resolveSubmitTemplate(
  formSlug?: string,
): Promise<
  | { template: FormTemplate; tag: string }
  | { error: string; status: number }
> {
  const slug = formSlug?.trim();
  if (!slug) {
    return { template: await getActiveFormTemplate(), tag: TAG_VOUCHER };
  }
  if (!isPublicSlug(slug)) {
    return { error: "Formulir tidak ditemukan.", status: 404 };
  }
  const template = await getFormTemplateBySlug(slug);
  if (!template || !isDigitalForm(template)) {
    return { error: "Formulir tidak ditemukan.", status: 404 };
  }
  if (!template.isPublished) {
    return { error: "Formulir belum tersedia.", status: 403 };
  }
  if (isFormExpired(template.expiresAt)) {
    return { error: "Tautan sudah berakhir.", status: 410 };
  }
  return { template, tag: TAG_FORM_DIGITAL };
}

type ExistingLeadRow = {
  id: string;
  tags?: unknown;
  edit_token?: string | null;
  form_answers?: unknown;
  lead_discount_code?: string | null;
};

function upsertDemoLead(data: {
  name: string;
  birthDate: string;
  email: string;
  city: string | null;
  waId: string;
  phone: string;
  formAnswers: Record<string, string | boolean>;
  templateDiscountCode: string;
  leadTag: string;
}) {
  const now = new Date().toISOString();
  const emailLower = data.email.toLowerCase();
  const existingIdx = DEMO_CUSTOMERS.findIndex(
    (c) =>
      c.waId === data.waId ||
      c.phone.replace(/\D/g, "") === data.waId ||
      (c.email && c.email.toLowerCase() === emailLower),
  );

  if (existingIdx >= 0) {
    const prev = DEMO_CUSTOMERS[existingIdx];
    const tags = stampLeadTag(prev.tags, data.leadTag);
    const editToken = prev.editToken || newEditToken();
    const discountCode = resolveStickyLeadDiscountCode({
      templateCode: data.templateDiscountCode,
      storedCode: prev.leadDiscountCode,
    });
    DEMO_CUSTOMERS[existingIdx] = {
      ...prev,
      name: data.name,
      phone: data.phone,
      waId: data.waId,
      email: data.email,
      city: data.city,
      birthDate: data.birthDate || null,
      consentStatus: "opted_in",
      consentChannel: "web_form",
      termsAcceptedAt: now,
      termsVersion: TERMS_VERSION,
      tags,
      editToken,
      formAnswers: data.formAnswers,
      leadDiscountCode: prev.leadDiscountCode?.trim() || discountCode,
    };
    return { id: prev.id, created: false, editToken, discountCode };
  }

  const discountCode = resolveStickyLeadDiscountCode({
    templateCode: data.templateDiscountCode,
    storedCode: null,
  });
  const editToken = newEditToken();
  const customer: Customer = {
    id: `c-lead-${Date.now()}`,
    waId: data.waId,
    name: data.name,
    phone: data.phone,
    email: data.email,
    city: data.city,
    birthDate: data.birthDate || null,
    consentStatus: "opted_in",
    consentChannel: "web_form",
    segments: ["New"],
    tags: [data.leadTag],
    lifetimeValue: 0,
    orderCount: 0,
    firstSeenAt: now,
    lastOrderAt: null,
    termsAcceptedAt: now,
    termsVersion: TERMS_VERSION,
    editToken,
    formAnswers: data.formAnswers,
    leadDiscountCode: discountCode,
    createdAt: now,
  };
  DEMO_CUSTOMERS.unshift(customer);
  return { id: customer.id, created: true, editToken, discountCode };
}

export async function POST(req: NextRequest) {
  // Each accepted submission sends a welcome email, so an unthrottled endpoint
  // is an email-bomb primitive.
  const limited = await enforceRateLimit(req, {
    scope: "leads:submit",
    limit: 8,
    windowSeconds: 3600,
  });
  if (limited) return limited;

  const body = (await req.json().catch(() => null)) as LeadBody | null;
  if (!body) {
    return NextResponse.json(
      { ok: false, error: "Permintaan tidak valid." },
      { status: 400 },
    );
  }

  const resolved = await resolveSubmitTemplate(body.formSlug);
  if ("error" in resolved) {
    return NextResponse.json(
      { ok: false, error: resolved.error },
      { status: resolved.status },
    );
  }
  const { template, tag: leadTag } = resolved;
  const templateDiscountCode = template.discountCode;

  const values: Record<string, unknown> = {
    ...(body.values ?? {}),
    name: body.values?.name ?? body.name,
    birthDate: body.values?.birthDate ?? body.birthDate,
    phone: body.values?.phone ?? body.phone,
    email: body.values?.email ?? body.email,
    city: body.values?.city ?? body.city,
    countryCode: body.values?.countryCode ?? body.countryCode,
    acceptTerms: body.acceptTerms ?? body.values?.acceptTerms,
  };

  const parsed = await parseLeadSubmission(template.fields, values, {
    countryCode: String(values.countryCode ?? ""),
  });
  if ("error" in parsed) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
  }
  const { lead, formAnswers } = parsed.data;

  const now = new Date().toISOString();

  if (!isSupabaseConfigured()) {
    const result = upsertDemoLead({
      ...lead,
      formAnswers,
      templateDiscountCode,
      leadTag,
    });
    try {
      await sendLeadWelcomeEmail({
        to: lead.email,
        name: lead.name,
        editToken: result.editToken,
        discountCode: result.discountCode,
      });
    } catch (e) {
      console.error("[leads] welcome email failed (non-blocking)", e);
    }
    return NextResponse.json({ ok: true, discountCode: result.discountCode });
  }

  const supabase = createSupabaseAdminClient();
  const existingSelect =
    "id, tags, edit_token, form_answers, lead_discount_code";

  const { data: byWa } = await supabase
    .from("customers")
    .select(existingSelect)
    .eq("wa_id", lead.waId)
    .maybeSingle();

  let existing = byWa as ExistingLeadRow | null;

  if (!existing) {
    const { data: byPhone } = await supabase
      .from("customers")
      .select(existingSelect)
      .eq("phone", lead.phone)
      .maybeSingle();
    existing = byPhone as ExistingLeadRow | null;
  }

  if (!existing) {
    const { data: byEmail } = await supabase
      .from("customers")
      .select(existingSelect)
      .ilike("email", lead.email)
      .maybeSingle();
    existing = byEmail as ExistingLeadRow | null;
  }

  const editToken =
    (existing?.edit_token as string | null | undefined) || newEditToken();

  const discountCode = resolveStickyLeadDiscountCode({
    templateCode: templateDiscountCode,
    storedCode: existing?.lead_discount_code,
  });

  // Assign once — never overwrite an earlier voucher on re-signup.
  const leadDiscountToStore =
    existing?.lead_discount_code?.trim() || discountCode;

  const prevAnswers =
    existing?.form_answers &&
    typeof existing.form_answers === "object" &&
    !Array.isArray(existing.form_answers)
      ? (existing.form_answers as Record<string, unknown>)
      : {};

  const payload = {
    name: lead.name,
    phone: lead.phone,
    wa_id: lead.waId,
    email: lead.email,
    city: lead.city,
    birth_date: lead.birthDate || null,
    consent_status: "opted_in" as const,
    consent_channel: "web_form",
    terms_accepted_at: now,
    terms_version: TERMS_VERSION,
    edit_token: editToken,
    form_answers: { ...prevAnswers, ...formAnswers },
    lead_discount_code: leadDiscountToStore,
  };

  let customerId: string;

  if (existing) {
    const tags: string[] = Array.isArray(existing.tags) ? [...existing.tags] : [];
    if (!tags.includes(leadTag)) tags.push(leadTag);

    const { data: waOwner } = await supabase
      .from("customers")
      .select("id")
      .eq("wa_id", lead.waId)
      .maybeSingle();
    const updateRow =
      waOwner && waOwner.id !== existing.id
        ? {
            name: payload.name,
            phone: payload.phone,
            email: payload.email,
            city: payload.city,
            birth_date: payload.birth_date,
            consent_status: payload.consent_status,
            consent_channel: payload.consent_channel,
            terms_accepted_at: payload.terms_accepted_at,
            terms_version: payload.terms_version,
            edit_token: editToken,
            form_answers: payload.form_answers,
            lead_discount_code: leadDiscountToStore,
            tags,
          }
        : { ...payload, tags };

    const { data: updated, error } = await supabase
      .from("customers")
      .update(updateRow)
      .eq("id", existing.id)
      .select("id")
      .single();

    if (error || !updated) {
      console.error("[leads] update failed", error);
      return NextResponse.json(
        { ok: false, error: "Gagal menyimpan data. Coba lagi." },
        { status: 500 },
      );
    }
    customerId = updated.id;
  } else {
    const { data: inserted, error } = await supabase
      .from("customers")
      .insert({
        ...payload,
        tags: [leadTag],
        segments: ["New"],
        first_seen_at: now,
      })
      .select("id")
      .single();

    if (error || !inserted) {
      console.error("[leads] insert failed", error);
      return NextResponse.json(
        { ok: false, error: "Gagal menyimpan data. Coba lagi." },
        { status: 500 },
      );
    }
    customerId = inserted.id;
  }

  const { error: consentError } = await supabase.from("customer_consents").insert({
    customer_id: customerId,
    status: "opted_in",
    channel: "web_form",
    scope: "messaging",
    note: CONSENT_NOTE,
  });

  if (consentError) {
    console.error("[leads] consent ledger failed", consentError);
  }

  try {
    await sendLeadWelcomeEmail({
      to: lead.email,
      name: lead.name,
      editToken,
      discountCode,
    });
  } catch (e) {
    console.error("[leads] welcome email failed (non-blocking)", e);
  }

  return NextResponse.json({ ok: true, discountCode });
}

import { NextRequest, NextResponse } from "next/server";
import { DEMO_CUSTOMERS } from "@/lib/demo/data";
import { getActiveFormTemplate } from "@/lib/data/form-templates";
import { sendLeadWelcomeEmail } from "@/lib/email";
import { isSupabaseConfigured } from "@/lib/env";
import { newEditToken } from "@/lib/lead-edit";
import { resolveLeadDiscountCode } from "@/lib/lead-offer";
import { parseLeadSubmission } from "@/lib/lead-form-submit";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
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
};

function upsertDemoLead(data: {
  name: string;
  birthDate: string;
  email: string;
  city: string | null;
  waId: string;
  phone: string;
  formAnswers: Record<string, string | boolean>;
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
    const tags = prev.tags.includes("qr_lead")
      ? prev.tags
      : [...prev.tags, "qr_lead"];
    const editToken = prev.editToken || newEditToken();
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
    };
    return { id: prev.id, created: false, editToken };
  }

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
    tags: ["qr_lead"],
    lifetimeValue: 0,
    orderCount: 0,
    firstSeenAt: now,
    lastOrderAt: null,
    termsAcceptedAt: now,
    termsVersion: TERMS_VERSION,
    editToken,
    formAnswers: data.formAnswers,
    createdAt: now,
  };
  DEMO_CUSTOMERS.unshift(customer);
  return { id: customer.id, created: true, editToken };
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as LeadBody | null;
  if (!body) {
    return NextResponse.json(
      { ok: false, error: "Permintaan tidak valid." },
      { status: 400 },
    );
  }

  const template = await getActiveFormTemplate();
  const discountCode = resolveLeadDiscountCode(template.discountCode);

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
    const result = upsertDemoLead({ ...lead, formAnswers });
    try {
      await sendLeadWelcomeEmail({
        to: lead.email,
        name: lead.name,
        editToken: result.editToken,
        discountCode,
      });
    } catch (e) {
      console.error("[leads] welcome email failed (non-blocking)", e);
    }
    return NextResponse.json({ ok: true });
  }

  const supabase = createSupabaseAdminClient();

  const { data: byWa } = await supabase
    .from("customers")
    .select("id, tags, edit_token, form_answers")
    .eq("wa_id", lead.waId)
    .maybeSingle();

  let existing = byWa;

  if (!existing) {
    const { data: byPhone } = await supabase
      .from("customers")
      .select("id, tags, edit_token, form_answers")
      .eq("phone", lead.phone)
      .maybeSingle();
    existing = byPhone;
  }

  if (!existing) {
    const { data: byEmail } = await supabase
      .from("customers")
      .select("id, tags, edit_token, form_answers")
      .ilike("email", lead.email)
      .maybeSingle();
    existing = byEmail;
  }

  const editToken =
    (existing?.edit_token as string | null | undefined) || newEditToken();

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
  };

  let customerId: string;

  if (existing) {
    const tags: string[] = Array.isArray(existing.tags) ? [...existing.tags] : [];
    if (!tags.includes("qr_lead")) tags.push("qr_lead");

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
        tags: ["qr_lead"],
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

  return NextResponse.json({ ok: true });
}

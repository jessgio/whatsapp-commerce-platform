import { NextRequest, NextResponse } from "next/server";
import { DEMO_CUSTOMERS } from "@/lib/demo/data";
import { isSupabaseConfigured } from "@/lib/env";
import { normalizePhone, normalizePhoneParts } from "@/lib/phone";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { Customer } from "@/lib/types";

const TERMS_VERSION = "qr_v1";
const CONSENT_NOTE =
  "QR form: accepted T&C opsi 1 (CRM & komunikasi) and opsi 2 (kerahasiaan data).";

type LeadBody = {
  name?: string;
  birthDate?: string;
  phone?: string;
  countryCode?: string;
  email?: string;
  city?: string;
  acceptTerms1?: boolean;
  acceptTerms2?: boolean;
};

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidBirthDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return false;
  const iso = d.toISOString().slice(0, 10);
  if (iso !== value) return false;
  const now = new Date();
  if (d > now) return false;
  // Reject obviously impossible ages
  const year = d.getUTCFullYear();
  const thisYear = now.getUTCFullYear();
  if (thisYear - year > 120) return false;
  return true;
}

function parseBody(body: LeadBody) {
  const name = body.name?.trim() ?? "";
  const birthDate = body.birthDate?.trim() ?? "";
  const email = body.email?.trim().toLowerCase() ?? "";
  const city = body.city?.trim() || null;
  const phoneRaw = body.phone?.trim() ?? "";
  const countryCode = body.countryCode?.trim() ?? "";

  if (!name || name.length < 2) {
    return { error: "Nama lengkap wajib diisi." as const };
  }
  if (!isValidBirthDate(birthDate)) {
    return { error: "Tanggal lahir tidak valid." as const };
  }
  const normalized = countryCode
    ? normalizePhoneParts(countryCode, phoneRaw)
    : normalizePhone(phoneRaw);
  if (!normalized) {
    return { error: "Nomor telepon tidak valid." as const };
  }
  if (!email || !isValidEmail(email)) {
    return { error: "Alamat email tidak valid." as const };
  }
  if (!body.acceptTerms1 || !body.acceptTerms2) {
    return { error: "Anda harus menyetujui kedua pernyataan T&C." as const };
  }

  return {
    data: {
      name,
      birthDate,
      email,
      city,
      waId: normalized.waId,
      phone: normalized.phone,
    },
  };
}

function upsertDemoLead(data: {
  name: string;
  birthDate: string;
  email: string;
  city: string | null;
  waId: string;
  phone: string;
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
    const tags = prev.tags.includes("qr_lead") ? prev.tags : [...prev.tags, "qr_lead"];
    DEMO_CUSTOMERS[existingIdx] = {
      ...prev,
      name: data.name,
      phone: data.phone,
      waId: data.waId,
      email: data.email,
      city: data.city,
      birthDate: data.birthDate,
      consentStatus: "opted_in",
      consentChannel: "web_form",
      termsAcceptedAt: now,
      termsVersion: TERMS_VERSION,
      tags,
    };
    return { id: prev.id, created: false };
  }

  const customer: Customer = {
    id: `c-lead-${Date.now()}`,
    waId: data.waId,
    name: data.name,
    phone: data.phone,
    email: data.email,
    city: data.city,
    birthDate: data.birthDate,
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
    createdAt: now,
  };
  DEMO_CUSTOMERS.unshift(customer);
  return { id: customer.id, created: true };
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as LeadBody | null;
  if (!body) {
    return NextResponse.json({ ok: false, error: "Permintaan tidak valid." }, { status: 400 });
  }

  const parsed = parseBody(body);
  if ("error" in parsed) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
  }

  const { data } = parsed;
  const now = new Date().toISOString();

  if (!isSupabaseConfigured()) {
    upsertDemoLead(data);
    return NextResponse.json({ ok: true });
  }

  const supabase = createSupabaseAdminClient();

  // Match by wa_id, normalized phone digits, or email (case-insensitive).
  const { data: byWa } = await supabase
    .from("customers")
    .select("id, tags")
    .eq("wa_id", data.waId)
    .maybeSingle();

  let existing = byWa;

  if (!existing) {
    const { data: byPhone } = await supabase
      .from("customers")
      .select("id, tags")
      .eq("phone", data.phone)
      .maybeSingle();
    existing = byPhone;
  }

  if (!existing) {
    const { data: byEmail } = await supabase
      .from("customers")
      .select("id, tags")
      .ilike("email", data.email)
      .maybeSingle();
    existing = byEmail;
  }

  const payload = {
    name: data.name,
    phone: data.phone,
    wa_id: data.waId,
    email: data.email,
    city: data.city,
    birth_date: data.birthDate,
    consent_status: "opted_in" as const,
    consent_channel: "web_form",
    terms_accepted_at: now,
    terms_version: TERMS_VERSION,
  };

  let customerId: string;

  if (existing) {
    const tags: string[] = Array.isArray(existing.tags) ? [...existing.tags] : [];
    if (!tags.includes("qr_lead")) tags.push("qr_lead");

    // Avoid unique wa_id clash when match was by email and phone belongs elsewhere.
    const { data: waOwner } = await supabase
      .from("customers")
      .select("id")
      .eq("wa_id", data.waId)
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
    // Customer row already saved — still succeed for the user.
  }

  return NextResponse.json({ ok: true });
}

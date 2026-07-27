import {
  isCustomFieldKey,
  isSystemFieldKey,
  type FormField,
} from "@/lib/form-templates";
import {
  isValidBirthDate,
  isValidEmail,
  type LeadFields,
} from "@/lib/lead-validation";
import { normalizePhone, normalizePhoneParts } from "@/lib/phone";
import { resolveCanonicalCity } from "@/lib/cities";

export type LeadSubmitValues = Record<string, unknown>;

export type ParsedLeadSubmission = {
  lead: LeadFields;
  formAnswers: Record<string, string | boolean>;
  acceptTerms: boolean;
};

/**
 * Validate a dynamic form submission against the active template fields.
 */
export async function parseLeadSubmission(
  fields: FormField[],
  values: LeadSubmitValues,
  options?: { countryCode?: string },
): Promise<{ data: ParsedLeadSubmission } | { error: string }> {
  const byKey = new Map(fields.map((f) => [f.key, f]));
  const formAnswers: Record<string, string | boolean> = {};

  const nameField = byKey.get("name");
  const phoneField = byKey.get("phone");
  const emailField = byKey.get("email");
  const termsField = byKey.get("terms");
  if (!nameField || !phoneField || !emailField || !termsField) {
    return { error: "Form konfigurasi tidak lengkap." };
  }

  const acceptTerms = Boolean(values.acceptTerms ?? values.terms);
  if (!acceptTerms) {
    return { error: "Anda harus menyetujui pernyataan Privasi Data." };
  }

  const name = String(values.name ?? "").trim();
  if (!name || name.length < 2) {
    return { error: `${nameField.label} wajib diisi.` };
  }

  const email = String(values.email ?? "")
    .trim()
    .toLowerCase();
  if (!email || !isValidEmail(email)) {
    return { error: `${emailField.label} tidak valid.` };
  }

  const phoneRaw = String(values.phone ?? "").trim();
  const countryCode =
    options?.countryCode?.trim() ||
    String(values.countryCode ?? "").trim() ||
    "";
  const normalized = countryCode
    ? normalizePhoneParts(countryCode, phoneRaw)
    : normalizePhone(phoneRaw);
  if (!normalized) {
    return { error: `${phoneField.label} tidak valid.` };
  }

  let birthDate = "";
  const birthField = byKey.get("birthDate");
  if (birthField) {
    birthDate = String(values.birthDate ?? "").trim();
    if (birthField.required || birthDate) {
      if (!isValidBirthDate(birthDate)) {
        return { error: `${birthField.label} tidak valid.` };
      }
    }
  }

  let city: string | null = null;
  const cityField = byKey.get("city");
  if (cityField) {
    const cityRaw = String(values.city ?? "").trim() || null;
    if (cityField.required && !cityRaw) {
      return { error: `${cityField.label} wajib diisi.` };
    }
    if (cityRaw) {
      const cityResolved = await resolveCanonicalCity(cityRaw);
      if ("error" in cityResolved) {
        return { error: cityResolved.error };
      }
      city = cityResolved.city;
    }
  }

  for (const field of fields) {
    if (!isCustomFieldKey(field.key)) continue;
    const raw = values[field.key];

    if (field.type === "checkbox") {
      const checked = Boolean(raw);
      if (field.required && !checked) {
        return { error: `${field.label} wajib dicentang.` };
      }
      formAnswers[field.key] = checked;
      continue;
    }

    const text = raw == null ? "" : String(raw).trim();
    if (field.required && !text) {
      return { error: `${field.label} wajib diisi.` };
    }
    if (field.type === "select" && text) {
      const allowed = new Set((field.options ?? []).map((o) => o.value));
      if (!allowed.has(text)) {
        return { error: `${field.label} tidak valid.` };
      }
    }
    if (text) formAnswers[field.key] = text;
  }

  // Ignore unknown system keys that aren't in the template
  for (const key of Object.keys(values)) {
    if (isSystemFieldKey(key) || key === "acceptTerms" || key === "countryCode") {
      continue;
    }
    if (!isCustomFieldKey(key)) continue;
    if (!byKey.has(key as FormField["key"])) {
      // drop unknown custom keys
      delete formAnswers[key];
    }
  }

  return {
    data: {
      lead: {
        name,
        birthDate: birthDate || "",
        email,
        city,
        waId: normalized.waId,
        phone: normalized.phone,
      },
      formAnswers,
      acceptTerms,
    },
  };
}

import { isKnownDialCode } from "@/lib/country-codes";

/**
 * Combine a selected country dial code with a national subscriber number.
 * Strips a leading trunk `0` from the national part (e.g. 0812… + 62 → 62812…).
 */
export function normalizePhoneParts(
  countryDial: string,
  nationalNumber: string,
): { waId: string; phone: string } | null {
  const dial = countryDial.replace(/\D/g, "");
  if (!dial || !isKnownDialCode(dial)) return null;

  let national = nationalNumber.replace(/\D/g, "");
  if (!national) return null;

  // Drop trunk prefix if the user typed a local leading zero
  if (national.startsWith("0")) national = national.slice(1);
  if (!national) return null;

  // Guard against pasting a full international number into the national field
  if (national.startsWith(dial)) national = national.slice(dial.length);
  if (!national) return null;

  const digits = `${dial}${national}`;

  // E.164 max 15 digits; require a plausible subscriber length
  if (digits.length < 8 || digits.length > 15) return null;
  if (national.length < 4 || national.length > 14) return null;

  return { waId: digits, phone: `+${digits}` };
}

/**
 * Normalize a free-form phone string (legacy / pasted full numbers).
 * Indonesian locals without a country code default to +62.
 */
export function normalizePhone(input: string): { waId: string; phone: string } | null {
  const raw = input.trim();
  if (!raw) return null;

  let digits = raw.replace(/\D/g, "");
  if (!digits) return null;

  // Strip leading international 00 prefix
  if (digits.startsWith("00")) digits = digits.slice(2);

  // Local Indonesian mobiles: 08… → 628…
  if (digits.startsWith("0")) digits = `62${digits.slice(1)}`;

  // Bare 8… (missing leading 0) → 628…
  if (digits.startsWith("8") && !digits.startsWith("62")) {
    digits = `62${digits}`;
  }

  if (digits.length < 8 || digits.length > 15) return null;

  return { waId: digits, phone: `+${digits}` };
}

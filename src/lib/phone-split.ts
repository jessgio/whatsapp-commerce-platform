import { COUNTRY_DIAL_CODES, DEFAULT_COUNTRY_DIAL } from "@/lib/country-codes";

/** Split E.164-ish digits into a known dial code + national number for the form. */
export function splitWaIdToFormParts(waIdOrPhone: string): {
  countryCode: string;
  national: string;
} {
  const digits = waIdOrPhone.replace(/\D/g, "");
  if (!digits) {
    return { countryCode: DEFAULT_COUNTRY_DIAL, national: "" };
  }

  const dials = [...new Set(COUNTRY_DIAL_CODES.map((c) => c.dial))].sort(
    (a, b) => b.length - a.length,
  );

  for (const dial of dials) {
    if (digits.startsWith(dial) && digits.length > dial.length) {
      return { countryCode: dial, national: digits.slice(dial.length) };
    }
  }

  return { countryCode: DEFAULT_COUNTRY_DIAL, national: digits };
}

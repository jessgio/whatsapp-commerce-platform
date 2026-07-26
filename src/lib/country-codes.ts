export type CountryDialCode = {
  iso: string;
  name: string;
  dial: string; // digits only, no "+"
};

/** Common dial codes; Indonesia first (default for the QR form). */
export const COUNTRY_DIAL_CODES: CountryDialCode[] = [
  { iso: "ID", name: "Indonesia", dial: "62" },
  { iso: "MY", name: "Malaysia", dial: "60" },
  { iso: "SG", name: "Singapore", dial: "65" },
  { iso: "TH", name: "Thailand", dial: "66" },
  { iso: "PH", name: "Philippines", dial: "63" },
  { iso: "VN", name: "Vietnam", dial: "84" },
  { iso: "BN", name: "Brunei", dial: "673" },
  { iso: "AU", name: "Australia", dial: "61" },
  { iso: "NZ", name: "New Zealand", dial: "64" },
  { iso: "JP", name: "Japan", dial: "81" },
  { iso: "KR", name: "South Korea", dial: "82" },
  { iso: "CN", name: "China", dial: "86" },
  { iso: "HK", name: "Hong Kong", dial: "852" },
  { iso: "TW", name: "Taiwan", dial: "886" },
  { iso: "IN", name: "India", dial: "91" },
  { iso: "AE", name: "United Arab Emirates", dial: "971" },
  { iso: "SA", name: "Saudi Arabia", dial: "966" },
  { iso: "QA", name: "Qatar", dial: "974" },
  { iso: "GB", name: "United Kingdom", dial: "44" },
  { iso: "US", name: "United States", dial: "1" },
  { iso: "CA", name: "Canada", dial: "1" },
  { iso: "NL", name: "Netherlands", dial: "31" },
  { iso: "DE", name: "Germany", dial: "49" },
  { iso: "FR", name: "France", dial: "33" },
];

export const DEFAULT_COUNTRY_DIAL = "62";

export function isKnownDialCode(dial: string): boolean {
  return COUNTRY_DIAL_CODES.some((c) => c.dial === dial);
}

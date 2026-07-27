/** Fallback QR lead offer when no form template override is set. */
export const LEAD_DISCOUNT_CODE = "AERIS15";

/** Prefer template discount code; fall back to the shared constant. */
export function resolveLeadDiscountCode(override?: string | null): string {
  const trimmed = override?.trim();
  return trimmed || LEAD_DISCOUNT_CODE;
}

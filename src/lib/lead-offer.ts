/** Fallback QR lead offer when no form template override is set. */
export const LEAD_DISCOUNT_CODE = "AERIS15";

/** Prefer template discount code; fall back to the shared constant. */
export function resolveLeadDiscountCode(override?: string | null): string {
  const trimmed = override?.trim();
  return trimmed || LEAD_DISCOUNT_CODE;
}

/**
 * Returning leads keep the voucher they first received (e.g. after you rotate
 * Shopee codes). New leads get the current template code.
 */
export function resolveStickyLeadDiscountCode(input: {
  templateCode?: string | null;
  storedCode?: string | null;
}): string {
  const stored = input.storedCode?.trim();
  if (stored) return stored;
  return resolveLeadDiscountCode(input.templateCode);
}

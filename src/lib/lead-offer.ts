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

/** Fisik = system card `/daftar`. Digital = Form Digital `/f/[slug]`. */
export type LeadOfferPlatform = "physical" | "digital";

export type PlatformDiscountCodes = {
  /** Code to show on thank-you / welcome for this submission. */
  issuedCode: string;
  physicalCode: string | null;
  digitalCode: string | null;
};

/**
 * One sticky code per platform. A phone that already has a fisik code can
 * still claim a digital code (and vice versa). Re-submit on the same
 * platform keeps the first issued code.
 */
export function resolvePlatformDiscountCodes(input: {
  platform: LeadOfferPlatform;
  templateCode?: string | null;
  physicalCode?: string | null;
  digitalCode?: string | null;
}): PlatformDiscountCodes {
  const physicalCode = input.physicalCode?.trim() || null;
  const digitalCode = input.digitalCode?.trim() || null;
  if (input.platform === "digital") {
    const issuedCode = resolveStickyLeadDiscountCode({
      templateCode: input.templateCode,
      storedCode: digitalCode,
    });
    return {
      issuedCode,
      physicalCode,
      digitalCode: digitalCode || issuedCode,
    };
  }
  const issuedCode = resolveStickyLeadDiscountCode({
    templateCode: input.templateCode,
    storedCode: physicalCode,
  });
  return {
    issuedCode,
    physicalCode: physicalCode || issuedCode,
    digitalCode,
  };
}

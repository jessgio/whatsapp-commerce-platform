import type { Metadata } from "next";
import { FormThankYouView } from "@/components/leads/form-thank-you-view";
import { getActiveFormTemplate } from "@/lib/data/form-templates";
import { resolveLeadDiscountCode } from "@/lib/lead-offer";

export const metadata: Metadata = {
  title: "Terima Kasih | Aeris Beauté",
};

function sanitizeDiscountCode(raw?: string): string | null {
  const code = raw?.trim();
  if (!code || code.length > 64) return null;
  // Shopee voucher codes are alphanumeric (plus common separators).
  if (!/^[A-Za-z0-9._-]+$/.test(code)) return null;
  return code;
}

export default async function TerimaKasihPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code: codeParam } = await searchParams;
  const template = await getActiveFormTemplate();
  const discountCode =
    sanitizeDiscountCode(codeParam) ??
    resolveLeadDiscountCode(template.discountCode);

  return (
    <FormThankYouView
      thankYou={template.thankYou}
      discountCode={discountCode}
      showPageChrome
    />
  );
}

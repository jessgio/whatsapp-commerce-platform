import type { Metadata } from "next";
import { FormThankYouView } from "@/components/leads/form-thank-you-view";
import { getActiveFormTemplate } from "@/lib/data/form-templates";
import { resolveLeadDiscountCode } from "@/lib/lead-offer";

export const metadata: Metadata = {
  title: "Terima Kasih | Aeris Beauté",
};

export default async function TerimaKasihPage() {
  const template = await getActiveFormTemplate();
  const discountCode = resolveLeadDiscountCode(template.discountCode);

  return (
    <FormThankYouView
      thankYou={template.thankYou}
      discountCode={discountCode}
      showPageChrome
    />
  );
}

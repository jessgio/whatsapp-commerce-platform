import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { FormThankYouView } from "@/components/leads/form-thank-you-view";
import { PublicFormUnavailable } from "@/components/leads/public-form-unavailable";
import { getFormTemplateBySlug } from "@/lib/data/form-templates";
import { isDigitalForm, isFormExpired, isPublicSlug } from "@/lib/digital-form";
import { resolveLeadDiscountCode } from "@/lib/lead-offer";

export const metadata: Metadata = {
  title: "Terima Kasih | Aeris Beauté",
};

function sanitizeDiscountCode(raw?: string): string | null {
  const code = raw?.trim();
  if (!code || code.length > 64) return null;
  if (!/^[A-Za-z0-9._-]+$/.test(code)) return null;
  return code;
}

export default async function DigitalFormThankYouPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ code?: string }>;
}) {
  const [{ slug }, { code: codeParam }] = await Promise.all([params, searchParams]);
  await connection();
  if (!isPublicSlug(slug)) notFound();

  const template = await getFormTemplateBySlug(slug);
  if (!template || !isDigitalForm(template)) notFound();

  if (!template.isPublished || isFormExpired(template.expiresAt)) {
    return (
      <PublicFormUnavailable
        title="Tautan sudah berakhir"
        body="Formulir ini sudah tidak tersedia."
      />
    );
  }

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

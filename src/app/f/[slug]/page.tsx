import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { LeadFormCard } from "@/components/leads/lead-form-card";
import { PublicFormUnavailable } from "@/components/leads/public-form-unavailable";
import { getFormTemplateBySlug } from "@/lib/data/form-templates";
import { isDigitalForm, isFormExpired, isPublicSlug } from "@/lib/digital-form";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const template = isPublicSlug(slug) ? await getFormTemplateBySlug(slug) : null;
  const title = template?.formPage.headline || "Form Digital";
  return {
    title: `${title} | Aeris Beauté`,
    description: template?.formPage.intro || "Lengkapi data kontak Anda untuk Aeris Beauté.",
  };
}

export default async function DigitalFormPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  await connection();
  if (!isPublicSlug(slug)) notFound();

  const template = await getFormTemplateBySlug(slug);
  if (!template || !isDigitalForm(template)) notFound();

  if (!template.isPublished) {
    return (
      <PublicFormUnavailable
        title="Formulir belum tersedia"
        body="Tautan ini belum dipublikasikan. Coba lagi nanti."
      />
    );
  }
  if (isFormExpired(template.expiresAt)) {
    return (
      <PublicFormUnavailable
        title="Tautan sudah berakhir"
        body="Formulir ini sudah melewati tanggal kedaluwarsa dan tidak menerima pendaftaran baru."
      />
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(111,44,63,0.12),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(180,158,142,0.25),_transparent_50%)]"
      />
      <div className="relative mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-4 py-10">
        <LeadFormCard
          formPage={template.formPage}
          fields={template.fields}
          formSlug={template.publicSlug ?? slug}
          className="animate-fade-in"
        />
      </div>
    </div>
  );
}

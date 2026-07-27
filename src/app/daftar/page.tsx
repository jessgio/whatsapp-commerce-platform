import type { Metadata } from "next";
import { BrandMark } from "@/components/brand-mark";
import { LeadForm } from "@/components/leads/lead-form";
import { getActiveFormTemplate } from "@/lib/data/form-templates";

export const metadata: Metadata = {
  title: "Daftar | Aeris Beauté",
  description: "Lengkapi data kontak Anda untuk Aeris Beauté.",
  icons: {
    icon: [{ url: "/brand/og-icon.png", type: "image/png" }],
    apple: [{ url: "/brand/og-icon.png" }],
  },
  openGraph: {
    title: "Daftar | Aeris Beauté",
    description: "Lengkapi data kontak Anda untuk Aeris Beauté.",
    url: "https://join.aerisbeaute.com/daftar",
    siteName: "Aeris Beauté",
    images: [
      { url: "/brand/og-icon.png", width: 512, height: 512, alt: "Aeris Beauté" },
    ],
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Daftar | Aeris Beauté",
    description: "Lengkapi data kontak Anda untuk Aeris Beauté.",
    images: ["/brand/og-icon.png"],
  },
};

export default async function DaftarPage() {
  const template = await getActiveFormTemplate();
  const { formPage, fields } = template;

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(111,44,63,0.12),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(180,158,142,0.25),_transparent_50%)]"
      />
      <div className="relative mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-4 py-10">
        <div className="animate-fade-in rounded-[20px] border border-border bg-surface p-6 shadow-[0_12px_40px_rgba(45,43,42,0.10)] sm:p-8">
          <div className="mb-6 flex items-center gap-2.5">
            <BrandMark size={40} />
            <div>
              <p className="text-lg font-semibold tracking-tight text-foreground">
                {formPage.brandTitle}
              </p>
              <p className="text-xs text-muted">{formPage.eyebrow}</p>
            </div>
          </div>

          <h1 className="text-xl font-semibold text-foreground">
            {formPage.headline}
          </h1>
          <p className="mt-1 text-sm text-muted">{formPage.intro}</p>

          <div className="mt-6">
            <LeadForm fields={fields} submitLabel={formPage.submitLabel} />
          </div>
        </div>
      </div>
    </div>
  );
}

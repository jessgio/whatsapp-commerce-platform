import type { Metadata } from "next";
import { LeadFormCard } from "@/components/leads/lead-form-card";
import { getActiveFormTemplate } from "@/lib/data/form-templates";

export const metadata: Metadata = {
  title: "Daftar | Aeris Beauté",
  description: "Lengkapi data kontak Anda untuk Aeris Beauté.",
  icons: {
    icon: [{ url: "/brand/aeris-mark-32.png", type: "image/png", sizes: "32x32" }],
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
        <LeadFormCard
          formPage={formPage}
          fields={fields}
          className="animate-fade-in"
        />
      </div>
    </div>
  );
}

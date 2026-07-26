import type { Metadata } from "next";
import { LeadForm } from "@/components/leads/lead-form";

export const metadata: Metadata = {
  title: "Daftar | Aeris Beauté",
  description: "Lengkapi data kontak Anda untuk Aeris Beauté.",
};

export default function DaftarPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(111,44,63,0.12),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(180,158,142,0.25),_transparent_50%)]"
      />
      <div className="relative mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-4 py-10">
        <div className="animate-fade-in rounded-[20px] border border-border bg-surface p-6 shadow-[0_12px_40px_rgba(45,43,42,0.10)] sm:p-8">
          <div className="mb-6 flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-merlot text-lg font-bold text-primary-foreground">
              A
            </span>
            <div>
              <p className="text-lg font-semibold tracking-tight text-foreground">
                Aeris Beauté
              </p>
              <p className="text-xs text-muted">Formulir data pelanggan</p>
            </div>
          </div>

          <h1 className="text-xl font-semibold text-foreground">Lengkapi data Anda</h1>
          <p className="mt-1 text-sm text-muted">
            Isi formulir di bawah ini. Data Anda akan tersimpan di sistem CRM kami.
          </p>

          <div className="mt-6">
            <LeadForm />
          </div>
        </div>
      </div>
    </div>
  );
}

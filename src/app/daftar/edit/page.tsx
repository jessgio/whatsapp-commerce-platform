import type { Metadata } from "next";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { LeadEditForm } from "@/components/leads/lead-edit-form";
import { getLeadProfileByEditToken } from "@/lib/data/lead-profile";

export const metadata: Metadata = {
  title: "Perbarui Data | Aeris Beauté",
};

export default async function DaftarEditPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const trimmed = token?.trim() ?? "";

  if (!trimmed) {
    return (
      <Shell>
        <h1 className="text-xl font-semibold text-foreground">Tautan tidak valid</h1>
        <p className="mt-2 text-sm text-muted">
          Buka ulang tautan dari email Anda untuk memperbarui data.
        </p>
      </Shell>
    );
  }

  const profile = await getLeadProfileByEditToken(trimmed);

  if (!profile) {
    return (
      <Shell>
        <h1 className="text-xl font-semibold text-foreground">Tautan tidak valid</h1>
        <p className="mt-2 text-sm text-muted">
          Tautan tidak ditemukan atau sudah tidak berlaku.
        </p>
        <Link href="/daftar" className="mt-6 inline-block text-sm text-merlot hover:underline">
          Ke formulir pendaftaran
        </Link>
      </Shell>
    );
  }

  return (
    <Shell>
      <h1 className="text-xl font-semibold text-foreground">Perbarui data Anda</h1>
      <p className="mt-1 text-sm text-muted">
        Koreksi informasi kontak Anda. Kode diskon tidak akan dikirim ulang.
      </p>
      <div className="mt-6">
        <LeadEditForm token={trimmed} initial={profile} />
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
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
                Aeris Beauté
              </p>
              <p className="text-xs text-muted">Perbarui data pelanggan</p>
            </div>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

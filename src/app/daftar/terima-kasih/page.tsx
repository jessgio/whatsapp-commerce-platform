import type { Metadata } from "next";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { LEAD_DISCOUNT_CODE } from "@/lib/lead-offer";

export const metadata: Metadata = {
  title: "Terima Kasih | Aeris Beauté",
};

export default function TerimaKasihPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(111,44,63,0.14),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(180,158,142,0.28),_transparent_50%)]"
      />
      <div className="relative mx-auto flex min-h-screen w-full max-w-lg flex-col items-center justify-center px-4 py-10 text-center">
        <div className="animate-fade-in w-full rounded-[20px] border border-border bg-surface p-8 shadow-[0_12px_40px_rgba(45,43,42,0.10)]">
          <div className="mx-auto mb-5 flex justify-center">
            <BrandMark size={48} className="rounded-full" />
          </div>
          <p className="text-sm font-medium uppercase tracking-wide text-merlot">
            Aeris Beauté
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-foreground">Terima kasih!</h1>
          <p className="mt-2 text-sm text-muted">
            Data Anda sudah kami terima. Gunakan kode diskon di bawah ini untuk
            pembelian berikutnya. Kami juga mengirimkan kode yang sama ke email
            Anda.
          </p>

          <div className="mt-8 rounded-xl border border-dashed border-merlot/40 bg-merlot/5 px-4 py-6">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              Kode diskon Anda
            </p>
            <p className="mt-2 font-mono text-3xl font-semibold tracking-[0.18em] text-merlot">
              {LEAD_DISCOUNT_CODE}
            </p>
          </div>

          <p className="mt-6 text-xs text-muted">
            Cek inbox (dan folder spam) jika belum melihat emailnya. Simpan atau
            screenshot kode ini juga.
          </p>

          <Link
            href="/daftar"
            className="mt-8 inline-block text-sm text-merlot hover:underline"
          >
            Kembali ke formulir
          </Link>
        </div>
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import { BrandMark } from "@/components/brand-mark";

export const metadata: Metadata = {
  title: "Data Diperbarui | Aeris Beauté",
};

export default function DaftarEditSelesaiPage() {
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
          <h1 className="mt-2 text-2xl font-semibold text-foreground">
            Data berhasil diperbarui
          </h1>
          <p className="mt-2 text-sm text-muted">
            Perubahan Anda sudah disimpan. Kode diskon tidak dikirim ulang — gunakan
            kode dari email atau halaman terima kasih sebelumnya.
          </p>
        </div>
      </div>
    </div>
  );
}

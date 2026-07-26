import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { LEAD_DISCOUNT_CODE } from "@/lib/lead-offer";

export const metadata: Metadata = {
  title: "Terima Kasih | Aeris Beauté",
};

export default function TerimaKasihPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#2a1a14]">
      <Image
        src="/images/leather-bg.png"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
        aria-hidden
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-black/20"
      />
      <div className="relative mx-auto flex min-h-screen w-full max-w-lg flex-col items-center justify-center px-4 py-10 text-center">
        <div className="animate-fade-in w-full rounded-[20px] border border-border bg-surface p-8 shadow-[0_16px_48px_rgba(0,0,0,0.35)]">
          <div className="mx-auto mb-5 flex justify-center">
            <Image
              src="/images/aeris-logo-transparent.png"
              alt="Aeris"
              width={979}
              height={206}
              className="h-auto w-44 object-contain"
              priority
            />
          </div>
          <div className="mb-6 overflow-hidden rounded-xl">
            <Image
              src="/images/terima-kasih-banner-v2.png"
              alt="Aeris Beauté Travel Series"
              width={1024}
              height={568}
              className="h-auto w-full object-cover"
              priority
            />
          </div>
          <h1 className="text-2xl font-semibold text-foreground">Terima kasih!</h1>
          <p className="mt-3 text-base font-semibold text-foreground">
            You’re in! Welcome to Aeris!
          </p>
          <p className="mt-3 text-sm text-muted">
            Terima kasih telah menjadi bagian dari Aeris Beauté.
          </p>
          <p className="mt-2 text-sm text-muted">
            Sebagai sambutan dari kami, nikmati 15% OFF untuk pembelian Anda
            berikutnya di toko{" "}
            <a
              href="https://shopee.co.id/aerisbeaute"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-foreground underline underline-offset-2 hover:text-merlot"
            >
              Shopee
            </a>{" "}
            resmi kami:
          </p>

          <a
            href="https://shopee.co.id/aerisbeaute"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 block rounded-xl border border-dashed border-merlot/40 bg-merlot/5 px-4 py-6 transition-colors hover:border-merlot/60 hover:bg-merlot/10"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              Kode diskon Anda
            </p>
            <p className="mt-2 font-mono text-3xl font-semibold tracking-[0.18em] text-merlot">
              {LEAD_DISCOUNT_CODE}
            </p>
          </a>

          <p className="mt-6 text-xs text-muted">
            Cek inbox (dan folder spam) jika belum melihat emailnya. Simpan atau
            screenshot kode ini juga.
          </p>

          <p className="mt-4 text-xs italic text-muted">
            Kode voucher berlaku hingga 30 September 2026.
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

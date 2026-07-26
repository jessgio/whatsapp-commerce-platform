import type { Metadata } from "next";
import { BrandMark } from "@/components/brand-mark";
import { CheckoutForm } from "@/components/checkout/checkout-form";

export const metadata: Metadata = {
  title: "Checkout | Aeris Beauté",
  description: "Lengkapi alamat dan bayar pesanan WhatsApp Catalog Anda.",
  robots: { index: false, follow: false },
  icons: {
    icon: [{ url: "/brand/og-icon.png", type: "image/png" }],
    apple: [{ url: "/brand/og-icon.png" }],
  },
};

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const checkoutToken = token?.trim() ?? "";

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
              <p className="text-xs text-muted">Checkout pesanan WhatsApp</p>
            </div>
          </div>

          <h1 className="text-xl font-semibold text-foreground">Selesaikan pesanan</h1>
          <p className="mt-1 text-sm text-muted">
            Konfirmasi data dan alamat, pilih ongkir, lalu lanjut bayar.
          </p>

          <div className="mt-6">
            {checkoutToken ? (
              <CheckoutForm token={checkoutToken} />
            ) : (
              <p className="text-sm text-red-700">
                Link checkout tidak lengkap. Buka kembali tautan dari WhatsApp.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

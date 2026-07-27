/**
 * Centralized environment access. The platform runs in two modes:
 *  - "supabase": fully wired to Supabase + external APIs (production).
 *  - "demo":     in-memory sample data so the portal is instantly usable
 *                without any credentials (great for local UX review).
 */

export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",

  /** Resend API key for transactional email (QR lead welcome, etc.). */
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  /** Verified sender, e.g. `Aeris Beauté <hello@aerisbeaute.com>`. */
  emailFrom: process.env.EMAIL_FROM ?? "",
  /** Public base for QR / edit links, e.g. `https://join.aerisbeaute.com`. */
  publicFormBaseUrl: process.env.PUBLIC_FORM_BASE_URL ?? "",

  whatsapp: {
    token: process.env.WHATSAPP_ACCESS_TOKEN ?? "",
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID ?? "",
    wabaId: process.env.WHATSAPP_WABA_ID ?? "",
    catalogId: process.env.WHATSAPP_CATALOG_ID ?? "",
    /**
     * Meta's subscription handshake token. The convenience default only applies
     * outside production — shipping a known literal would let anyone re-point
     * the webhook subscription.
     */
    verifyToken:
      process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ??
      (process.env.NODE_ENV === "production" ? "" : "merlot-verify"),
    appSecret: process.env.WHATSAPP_APP_SECRET ?? "",
  },

  payments: {
    provider: (process.env.PAYMENT_PROVIDER ?? "midtrans") as
      | "midtrans"
      | "xendit",
    midtransServerKey: process.env.MIDTRANS_SERVER_KEY ?? "",
    xenditSecretKey: process.env.XENDIT_SECRET_KEY ?? "",
    /** Sent by Xendit as the `x-callback-token` header on every notification. */
    xenditCallbackToken: process.env.XENDIT_CALLBACK_TOKEN ?? "",
    isProduction: process.env.PAYMENT_IS_PRODUCTION === "true",
  },

  shipping: {
    biteshipKey: process.env.BITESHIP_API_KEY ?? "",
    /** Shared secret expected in the `x-biteship-signature` webhook header. */
    webhookSecret: process.env.BITESHIP_WEBHOOK_SECRET ?? "",
    originPostalCode: process.env.WAREHOUSE_ORIGIN_POSTAL_CODE ?? "12190",
    originContactName: process.env.WAREHOUSE_ORIGIN_CONTACT_NAME ?? "Warehouse",
    originContactPhone: process.env.WAREHOUSE_ORIGIN_CONTACT_PHONE ?? "081234567890",
    originAddress:
      process.env.WAREHOUSE_ORIGIN_ADDRESS ??
      "Jl. Sudirman No. 1, Jakarta Selatan",
  },
} as const;

export function isSupabaseConfigured(): boolean {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey);
}

export function dataMode(): "supabase" | "demo" {
  return isSupabaseConfigured() ? "supabase" : "demo";
}

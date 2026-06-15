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

  whatsapp: {
    token: process.env.WHATSAPP_ACCESS_TOKEN ?? "",
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID ?? "",
    wabaId: process.env.WHATSAPP_WABA_ID ?? "",
    catalogId: process.env.WHATSAPP_CATALOG_ID ?? "",
    verifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ?? "merlot-verify",
    appSecret: process.env.WHATSAPP_APP_SECRET ?? "",
  },

  payments: {
    provider: (process.env.PAYMENT_PROVIDER ?? "midtrans") as
      | "midtrans"
      | "xendit",
    midtransServerKey: process.env.MIDTRANS_SERVER_KEY ?? "",
    xenditSecretKey: process.env.XENDIT_SECRET_KEY ?? "",
    isProduction: process.env.PAYMENT_IS_PRODUCTION === "true",
  },

  shipping: {
    biteshipKey: process.env.BITESHIP_API_KEY ?? "",
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

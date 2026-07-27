import Constants from "expo-constants";

const extra = (Constants.expoConfig?.extra ?? {}) as {
  apiUrl?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  demoLogin?: string;
};

function envFlag(value: string | undefined): boolean {
  const v = (value ?? "").trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

/** Next.js origin hosting `/api/staff/*` (no trailing slash). */
export const API_URL = String(
  process.env.EXPO_PUBLIC_API_URL || extra.apiUrl || "http://localhost:3000",
).replace(/\/$/, "");

export const SUPABASE_URL = String(
  process.env.EXPO_PUBLIC_SUPABASE_URL || extra.supabaseUrl || "",
);

export const SUPABASE_ANON_KEY = String(
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || extra.supabaseAnonKey || "",
);

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/** When true (or Supabase unset), login offers demo role pickers. */
export const allowDemoLogin =
  envFlag(process.env.EXPO_PUBLIC_DEMO_LOGIN) ||
  envFlag(extra.demoLogin) ||
  !isSupabaseConfigured;

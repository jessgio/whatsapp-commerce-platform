import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { env } from "@/lib/env";
import { staffAccessTokenStore } from "@/lib/supabase/request-auth";

/** Supabase client authenticated with a staff Bearer access token (RLS-aware). */
export function createSupabaseBearerClient(accessToken: string) {
  return createClient(env.supabaseUrl, env.supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

/** Server-side Supabase client bound to the request cookies (RLS-aware). */
export async function createSupabaseServerClient() {
  const bearer = staffAccessTokenStore.getStore();
  if (bearer) return createSupabaseBearerClient(bearer);

  const cookieStore = await cookies();
  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // called from a Server Component — safe to ignore, the proxy refreshes
        }
      },
    },
  });
}

/**
 * Service-role client for trusted server contexts (webhooks, storage, cron).
 * Uses supabase-js (not SSR cookie client) so Storage uploads work reliably.
 */
export function createSupabaseAdminClient() {
  if (!env.supabaseUrl || !env.supabaseServiceKey) {
    throw new Error("Supabase service client is not configured.");
  }
  return createClient(env.supabaseUrl, env.supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

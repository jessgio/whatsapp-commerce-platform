import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

/** Server-side Supabase client bound to the request cookies (RLS-aware). */
export async function createSupabaseServerClient() {
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
          // called from a Server Component — safe to ignore, middleware refreshes
        }
      },
    },
  });
}

/** Service-role client for trusted server contexts (webhooks, cron). Bypasses RLS. */
export function createSupabaseAdminClient() {
  return createServerClient(env.supabaseUrl, env.supabaseServiceKey, {
    cookies: { getAll: () => [], setAll: () => {} },
  });
}

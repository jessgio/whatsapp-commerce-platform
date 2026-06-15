import { cookies } from "next/headers";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DEMO_USERS } from "@/lib/demo/data";
import type { AppUser, Role } from "@/lib/types";

export const DEMO_COOKIE = "merlot_demo_user";

/**
 * Resolves the current authenticated user.
 * In Supabase mode this reads the session + `users` profile row.
 * In demo mode it reads the selected demo identity from a cookie.
 */
export async function getCurrentUser(): Promise<AppUser | null> {
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from("users")
      .select("id, name, email, role, avatar_color")
      .eq("id", user.id)
      .single();

    if (!profile) return null;
    return {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      role: profile.role as Role,
      avatarColor: profile.avatar_color ?? "#6f2c3f",
    };
  }

  const store = await cookies();
  const id = store.get(DEMO_COOKIE)?.value;
  if (!id) return null;
  return DEMO_USERS.find((u) => u.id === id) ?? null;
}

import "server-only";
import { isSupabaseConfigured } from "@/lib/env";
import { isAllowedStaffEmail } from "@/lib/auth-policy";
import { DEMO_USERS } from "@/lib/demo/data";
import { can, ROLE_PERMISSIONS, type Permission } from "@/lib/rbac";
import { createSupabaseBearerClient } from "@/lib/supabase/server";
import { forceDemoDataStore, staffAccessTokenStore } from "@/lib/supabase/request-auth";
import type { AppUser, Role } from "@/lib/types";

export class StaffAuthError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function demoApiAllowed(): boolean {
  return !isSupabaseConfigured() || process.env.STAFF_API_ALLOW_DEMO === "true";
}

function parseAuthorization(header: string | null): {
  kind: "bearer" | "demo";
  value: string;
} | null {
  if (!header) return null;
  const bearer = header.match(/^Bearer\s+(.+)$/i);
  if (bearer?.[1]) return { kind: "bearer", value: bearer[1].trim() };
  const demo = header.match(/^Demo\s+(.+)$/i);
  if (demo?.[1]) return { kind: "demo", value: demo[1].trim() };
  return null;
}

async function resolveStaffUser(auth: {
  kind: "bearer" | "demo";
  value: string;
}): Promise<AppUser> {
  if (auth.kind === "demo") {
    if (!demoApiAllowed()) {
      throw new StaffAuthError(
        401,
        "Demo tokens are disabled. Use a Supabase Bearer token, or set STAFF_API_ALLOW_DEMO=true for local testing.",
      );
    }
    const user = DEMO_USERS.find((u) => u.id === auth.value);
    if (!user) throw new StaffAuthError(401, "Invalid demo user.");
    return user;
  }

  if (!isSupabaseConfigured()) {
    throw new StaffAuthError(503, "Supabase is not configured.");
  }

  const supabase = createSupabaseBearerClient(auth.value);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(auth.value);
  if (error || !user) throw new StaffAuthError(401, "Invalid or expired session.");

  const email = (user.email ?? "").toLowerCase();
  if (!isAllowedStaffEmail(email)) {
    throw new StaffAuthError(403, "Staff email domain is not allowed.");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("id, name, email, role, avatar_color")
    .eq("id", user.id)
    .single();

  if (!profile) throw new StaffAuthError(403, "Staff profile not found.");

  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    role: profile.role as Role,
    avatarColor: profile.avatar_color ?? "#6f2c3f",
  };
}

/** Authenticate a staff API request and optionally require a permission. */
export async function requireStaffApiUser(
  request: Request,
  permission?: Permission,
): Promise<{ user: AppUser; accessToken: string | null; demo: boolean }> {
  const parsed = parseAuthorization(request.headers.get("authorization"));
  if (!parsed) throw new StaffAuthError(401, "Missing Authorization header.");

  const user = await resolveStaffUser(parsed);
  if (permission && !can(user.role, permission)) {
    throw new StaffAuthError(403, "Missing permission.");
  }

  return {
    user,
    accessToken: parsed.kind === "bearer" ? parsed.value : null,
    demo: parsed.kind === "demo",
  };
}

/** Run work with the Bearer token available to `createSupabaseServerClient`. */
export function withStaffAccessToken<T>(
  accessToken: string | null,
  fn: () => Promise<T>,
): Promise<T> {
  if (!accessToken) return fn();
  return staffAccessTokenStore.run(accessToken, fn);
}

/** Run staff handlers under demo-dataset mode (Demo Authorization). */
export function withStaffDemoData<T>(fn: () => Promise<T>): Promise<T> {
  return forceDemoDataStore.run(true, fn);
}

/** Apply Bearer RLS context or forced demo dataset for the request. */
export function withStaffDataContext<T>(
  ctx: { accessToken: string | null; demo: boolean },
  fn: () => Promise<T>,
): Promise<T> {
  if (ctx.demo) return withStaffDemoData(fn);
  return withStaffAccessToken(ctx.accessToken, fn);
}

export function staffMePayload(user: AppUser) {
  return {
    user,
    permissions: ROLE_PERMISSIONS[user.role] ?? [],
  };
}

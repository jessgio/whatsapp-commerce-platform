import { NextResponse } from "next/server";
import { isAllowedStaffEmail, STAFF_EMAIL_DOMAIN } from "@/lib/auth-policy";
import { homePathForRole } from "@/lib/rbac";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/types";

function redirectUrl(request: Request, path: string): URL {
  const { origin } = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host");
  const isLocalEnv = process.env.NODE_ENV === "development";
  if (!isLocalEnv && forwardedHost) {
    return new URL(path, `https://${forwardedHost}`);
  }
  return new URL(path, origin);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const oauthError = searchParams.get("error_description") ?? searchParams.get("error");

  if (oauthError) {
    return NextResponse.redirect(
      redirectUrl(request, `/login?error=${encodeURIComponent(oauthError)}`),
    );
  }

  if (!code) {
    return NextResponse.redirect(
      redirectUrl(
        request,
        `/login?error=${encodeURIComponent("Missing authorization code from Google.")}`,
      ),
    );
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      redirectUrl(request, `/login?error=${encodeURIComponent(error.message)}`),
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const email = user?.email ?? "";
  if (!user || !isAllowedStaffEmail(email)) {
    await supabase.auth.signOut();
    if (user?.id) {
      try {
        const admin = createSupabaseAdminClient();
        await admin.auth.admin.deleteUser(user.id);
      } catch {
        // Best-effort cleanup; user is already signed out locally.
      }
    }
    return NextResponse.redirect(
      redirectUrl(
        request,
        `/login?error=${encodeURIComponent(
          `Only @${STAFF_EMAIL_DOMAIN} email addresses can sign in.`,
        )}`,
      ),
    );
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  return NextResponse.redirect(
    redirectUrl(request, profile ? homePathForRole(profile.role as Role) : "/"),
  );
}

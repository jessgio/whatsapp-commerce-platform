"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/env";
import { isAllowedStaffEmail, STAFF_EMAIL_DOMAIN } from "@/lib/auth-policy";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";
import { DEMO_COOKIE, getCurrentUser } from "@/lib/auth";
import { DEMO_USERS } from "@/lib/demo/data";

function requestOrigin(headerStore: Headers): string {
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  if (!host) return "http://localhost:3000";
  const proto = headerStore.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function signInDemo(userId: string) {
  const user = DEMO_USERS.find((u) => u.id === userId);
  if (!user) return;
  const store = await cookies();
  store.set(DEMO_COOKIE, user.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  redirect(user.role === "warehouse" ? "/warehouse" : user.role === "cs" ? "/cs-dashboard" : "/dashboard");
}

export async function signInWithGoogle() {
  if (!isSupabaseConfigured()) redirect("/login");

  const origin = requestOrigin(await headers());
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback`,
      queryParams: {
        hd: STAFF_EMAIL_DOMAIN,
        prompt: "select_account",
      },
    },
  });

  if (error || !data.url) {
    redirect(
      `/login?error=${encodeURIComponent(error?.message ?? "Could not start Google sign-in.")}`,
    );
  }
  redirect(data.url);
}

export async function signInWithPassword(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!isSupabaseConfigured()) return;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
  redirect("/dashboard");
}

export async function signUpWithPassword(formData: FormData) {
  if (!isSupabaseConfigured()) redirect("/login");

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (name.length < 2) {
    redirect("/signup?error=" + encodeURIComponent("Please enter your full name."));
  }
  if (!isAllowedStaffEmail(email)) {
    redirect(
      "/signup?error=" +
        encodeURIComponent("Only @aerisbeaute.com email addresses can create an account."),
    );
  }
  if (password.length < 8) {
    redirect("/signup?error=" + encodeURIComponent("Password must be at least 8 characters."));
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, role: "sales" },
  });

  if (error) {
    redirect("/signup?error=" + encodeURIComponent(error.message));
  }

  await admin.from("users").upsert(
    { id: data.user.id, name, email, role: "sales" },
    { onConflict: "id" },
  );

  const supabase = await createSupabaseServerClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) {
    redirect(
      "/login?error=" +
        encodeURIComponent("Account created. Please sign in with your new credentials."),
    );
  }
  redirect("/dashboard");
}

export async function changePassword(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (!isSupabaseConfigured()) {
    redirect(
      "/account?error=" +
        encodeURIComponent("Password change is only available when signed in with Supabase."),
    );
  }

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!currentPassword) {
    redirect("/account?error=" + encodeURIComponent("Enter your current password."));
  }
  if (newPassword.length < 8) {
    redirect("/account?error=" + encodeURIComponent("New password must be at least 8 characters."));
  }
  if (newPassword !== confirmPassword) {
    redirect("/account?error=" + encodeURIComponent("New passwords do not match."));
  }
  if (newPassword === currentPassword) {
    redirect(
      "/account?error=" + encodeURIComponent("New password must be different from your current password."),
    );
  }

  const supabase = await createSupabaseServerClient();
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (verifyError) {
    redirect("/account?error=" + encodeURIComponent("Current password is incorrect."));
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    redirect("/account?error=" + encodeURIComponent(error.message));
  }

  redirect("/account?success=" + encodeURIComponent("Password updated successfully."));
}

export async function signOut() {
  const store = await cookies();
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  store.delete(DEMO_COOKIE);
  redirect("/login");
}

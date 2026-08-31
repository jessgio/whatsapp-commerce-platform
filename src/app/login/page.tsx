import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, Mail } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { dataMode } from "@/lib/env";
import { STAFF_EMAIL_DOMAIN } from "@/lib/auth-policy";
import { homePathForRole, ROLE_LABELS } from "@/lib/rbac";
import { DEMO_USERS } from "@/lib/demo/data";
import { Avatar } from "@/components/ui";
import { GoogleIcon } from "@/components/google-icon";
import { AuthSplitShell } from "@/components/auth/auth-split-shell";
import { PasswordField } from "@/components/auth/password-field";
import { signInDemo, signInWithGoogle, signInWithPassword } from "@/app/auth-actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect(homePathForRole(user.role));
  const { error } = await searchParams;
  const mode = dataMode();

  return (
    <AuthSplitShell
      headline="WhatsApp Commerce Workspace."
      description={
        <>
          Inbox, orders, warehouse, and campaigns for WhatsApp ecommerce —{" "}
          <span className="underline decoration-white/40 underline-offset-[5px]">
            In one place.
          </span>
        </>
      }
    >
      <h2 className="text-[26px] font-semibold tracking-tight text-foreground">
        Welcome back
      </h2>
      <p className="mt-1.5 text-sm text-muted">
        Sign in to continue to WhatsApp Commerce
      </p>

      {error && (
        <p className="mt-5 rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      {mode === "supabase" ? (
        <>
          <form action={signInWithPassword} className="mt-7 space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-medium text-foreground"
              >
                Email
              </label>
              <div className="relative">
                <Mail
                  aria-hidden
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                  strokeWidth={1.75}
                />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder={`you@${STAFF_EMAIL_DOMAIN}`}
                  className="h-12 w-full rounded-xl bg-[#F7F1E8] pl-11 pr-3 text-sm text-foreground outline-none ring-1 ring-transparent transition placeholder:text-muted/70 focus:bg-white focus:ring-merlot/25"
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium text-foreground"
              >
                Password
              </label>
              <PasswordField />
            </div>
            <button
              type="submit"
              className="flex h-12 w-full items-center justify-center gap-1 rounded-full bg-[#8B4455] text-sm font-medium text-white transition hover:bg-[#7a3b4b]"
            >
              Sign In
              <ChevronRight className="h-4 w-4" strokeWidth={2.2} />
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted">
              Or continue with
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <form action={signInWithGoogle}>
            <button
              type="submit"
              className="flex h-12 w-full items-center justify-center gap-2.5 rounded-full border border-[#E6DCD0] bg-white text-sm font-medium text-foreground transition hover:bg-[#F9F6F1]"
            >
              <GoogleIcon className="h-[18px] w-[18px]" />
              Sign in with Google
            </button>
          </form>
          <p className="mt-3 text-center text-xs text-muted">
            Use your{" "}
            <span className="font-medium text-foreground">@{STAFF_EMAIL_DOMAIN}</span>{" "}
            Google account.
          </p>
          <p className="mt-4 text-center text-sm text-muted">
            New team member?{" "}
            <Link href="/signup" className="font-medium text-merlot hover:underline">
              Create account
            </Link>
          </p>
        </>
      ) : (
        <div className="mt-7">
          <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.18em] text-muted">
            Demo · pick a role to explore
          </p>
          <div className="space-y-2">
            {DEMO_USERS.map((u) => (
              <form action={signInDemo.bind(null, u.id)} key={u.id}>
                <button className="flex w-full items-center gap-3 rounded-xl border border-[#E6DCD0] bg-white px-3 py-2.5 text-left transition hover:bg-[#F9F6F1]">
                  <Avatar name={u.name} color={u.avatarColor} size={34} />
                  <span className="flex-1">
                    <span className="block text-sm font-medium text-foreground">
                      {u.name}
                    </span>
                    <span className="block text-xs text-muted">
                      {ROLE_LABELS[u.role]}
                    </span>
                  </span>
                  <span className="text-xs text-taupe">Sign in →</span>
                </button>
              </form>
            ))}
          </div>
        </div>
      )}
    </AuthSplitShell>
  );
}

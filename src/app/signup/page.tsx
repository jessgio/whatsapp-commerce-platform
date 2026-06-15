import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { dataMode } from "@/lib/env";
import { STAFF_EMAIL_DOMAIN } from "@/lib/auth-policy";
import { signUpWithPassword } from "@/app/auth-actions";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");
  if (dataMode() !== "supabase") redirect("/login");

  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-4xl overflow-hidden rounded-[20px] border border-border bg-surface shadow-[0_12px_40px_rgba(45,43,42,0.10)] md:grid md:grid-cols-2">
        <div className="hidden flex-col justify-between bg-sidebar p-8 text-cream md:flex">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-merlot text-base font-bold text-primary-foreground">
              A
            </span>
            <span className="text-lg font-semibold">Aeris Beaute</span>
          </div>
          <div className="space-y-3">
            <h2 className="text-2xl font-semibold leading-snug">Join the team workspace.</h2>
            <p className="text-sm text-taupe">
              Create your account with your company email. Access is limited to{" "}
              <span className="font-medium text-cream">@{STAFF_EMAIL_DOMAIN}</span> addresses.
            </p>
          </div>
          <div className="flex gap-1.5">
            {["#f6f1e9", "#d8c9b5", "#b49e8e", "#5f5448", "#6f2c3f", "#2d2b2a"].map((c) => (
              <span key={c} className="h-6 w-6 rounded-md" style={{ background: c }} />
            ))}
          </div>
        </div>

        <div className="p-8">
          <div className="mb-6 flex items-center gap-2.5 md:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-merlot text-base font-bold text-primary-foreground">
              A
            </span>
            <span className="text-lg font-semibold text-foreground">Aeris Beaute</span>
          </div>
          <h1 className="text-xl font-semibold text-foreground">Create account</h1>
          <p className="mt-1 text-sm text-muted">
            Full name, <span className="font-medium text-foreground">@{STAFF_EMAIL_DOMAIN}</span> email,
            and password.
          </p>

          {error && (
            <p className="mt-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
          )}

          <form action={signUpWithPassword} className="mt-6 space-y-3">
            <div>
              <label htmlFor="name" className="mb-1 block text-xs font-medium text-muted">
                Full name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                autoComplete="name"
                placeholder="Jessica Tan"
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-merlot"
              />
            </div>
            <div>
              <label htmlFor="email" className="mb-1 block text-xs font-medium text-muted">
                Work email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder={`you@${STAFF_EMAIL_DOMAIN}`}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-merlot"
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1 block text-xs font-medium text-muted">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="At least 8 characters"
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-merlot"
              />
            </div>
            <button className="w-full rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-merlot-600">
              Create account
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-muted">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-merlot hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

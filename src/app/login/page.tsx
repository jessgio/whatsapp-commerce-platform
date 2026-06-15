import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { dataMode } from "@/lib/env";
import { ROLE_LABELS } from "@/lib/rbac";
import { DEMO_USERS } from "@/lib/demo/data";
import { Avatar } from "@/components/ui";
import { signInDemo, signInWithPassword } from "@/app/auth-actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");
  const { error } = await searchParams;
  const mode = dataMode();

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
            <h2 className="text-2xl font-semibold leading-snug">
              WhatsApp Commerce, unified.
            </h2>
            <p className="text-sm text-taupe">
              CRM, orders, warehouse and customer service for your WhatsApp
              Business channel — in one snappy internal portal.
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
          <h1 className="text-xl font-semibold text-foreground">Sign in</h1>
          <p className="mt-1 text-sm text-muted">Access your team workspace.</p>

          {error && (
            <p className="mt-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
          )}

          {mode === "supabase" ? (
            <>
              <form action={signInWithPassword} className="mt-6 space-y-3">
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="you@aerisbeaute.com"
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-merlot"
                />
                <input
                  name="password"
                  type="password"
                  required
                  placeholder="Password"
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-merlot"
                />
                <button className="w-full rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-merlot-600">
                  Sign in
                </button>
              </form>
              <p className="mt-4 text-center text-sm text-muted">
                New team member?{" "}
                <Link href="/signup" className="font-medium text-merlot hover:underline">
                  Create account
                </Link>
              </p>
            </>
          ) : (
            <div className="mt-6">
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">
                Demo · pick a role to explore
              </p>
              <div className="space-y-2">
                {DEMO_USERS.map((u) => (
                  <form action={signInDemo.bind(null, u.id)} key={u.id}>
                    <button className="flex w-full items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2.5 text-left transition-colors hover:border-merlot hover:bg-surface-muted">
                      <Avatar name={u.name} color={u.avatarColor} size={34} />
                      <span className="flex-1">
                        <span className="block text-sm font-medium text-foreground">{u.name}</span>
                        <span className="block text-xs text-muted">{ROLE_LABELS[u.role]}</span>
                      </span>
                      <span className="text-xs text-taupe">Sign in →</span>
                    </button>
                  </form>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

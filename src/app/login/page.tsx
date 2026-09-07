import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { dataMode } from "@/lib/env";
import { homePathForRole, ROLE_LABELS } from "@/lib/rbac";
import { DEMO_USERS } from "@/lib/demo/data";
import { Avatar } from "@/components/ui";
import { AuthSplitShell } from "@/components/auth/auth-split-shell";
import { LoginForms } from "@/components/auth/login-forms";
import { signInDemo } from "@/app/auth-actions";

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
      <h2 className="text-[22px] font-semibold tracking-tight text-foreground">
        Welcome back
      </h2>
      <p className="mt-1 text-sm text-muted">
        Sign in to continue to WhatsApp Commerce
      </p>

      {error && (
        <p className="mt-3 rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      {mode === "supabase" ? (
        <LoginForms />
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

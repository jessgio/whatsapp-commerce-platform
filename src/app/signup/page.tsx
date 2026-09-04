import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { dataMode } from "@/lib/env";
import { homePathForRole } from "@/lib/rbac";
import { AuthSplitShell } from "@/components/auth/auth-split-shell";
import { SignupForms } from "@/components/auth/signup-forms";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect(homePathForRole(user.role));
  if (dataMode() !== "supabase") redirect("/login");

  const { error } = await searchParams;

  return (
    <AuthSplitShell
      headline="Join the team workspace."
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
        Create account
      </h2>
      <p className="mt-1.5 text-sm text-muted">
        Sign up to continue to WhatsApp Commerce
      </p>

      {error && (
        <p className="mt-5 rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <SignupForms />
    </AuthSplitShell>
  );
}

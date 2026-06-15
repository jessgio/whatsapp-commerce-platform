import Link from "next/link";
import { requirePermission } from "@/lib/guard";
import { isSupabaseConfigured } from "@/lib/env";
import { ROLE_LABELS } from "@/lib/rbac";
import { changePassword } from "@/app/auth-actions";
import { Avatar, Card, CardBody, CardHeader, CardTitle, PageHeader } from "@/components/ui";

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const user = await requirePermission("account.view");
  const { error, success } = await searchParams;
  const live = isSupabaseConfigured();

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <PageHeader title="Account" subtitle="Your profile and security settings" />

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardBody className="flex items-center gap-3 pt-0">
          <Avatar name={user.name} color={user.avatarColor} size={44} />
          <div>
            <div className="text-sm font-medium text-foreground">{user.name}</div>
            <div className="text-xs text-muted">{user.email}</div>
            <div className="mt-1 text-xs text-muted">{ROLE_LABELS[user.role]}</div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change password</CardTitle>
        </CardHeader>
        <CardBody className="pt-0">
          {error && (
            <p className="mb-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
          )}
          {success && (
            <p className="mb-4 rounded-lg bg-success/10 px-3 py-2 text-sm text-success">{success}</p>
          )}

          {!live ? (
            <p className="text-sm text-muted">
              Password management is available in live mode with Supabase authentication. In demo mode,
              switch roles from the{" "}
              <Link href="/login" className="font-medium text-merlot hover:underline">
                login page
              </Link>
              .
            </p>
          ) : (
            <form action={changePassword} className="space-y-3">
              <div>
                <label htmlFor="currentPassword" className="mb-1 block text-xs font-medium text-muted">
                  Current password
                </label>
                <input
                  id="currentPassword"
                  name="currentPassword"
                  type="password"
                  required
                  autoComplete="current-password"
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-merlot"
                />
              </div>
              <div>
                <label htmlFor="newPassword" className="mb-1 block text-xs font-medium text-muted">
                  New password
                </label>
                <input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-merlot"
                />
              </div>
              <div>
                <label htmlFor="confirmPassword" className="mb-1 block text-xs font-medium text-muted">
                  Confirm new password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-merlot"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-merlot-600"
              >
                Update password
              </button>
            </form>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

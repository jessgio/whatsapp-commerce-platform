import Link from "next/link";
import { LogOut } from "lucide-react";
import { Avatar } from "@/components/ui";
import { ROLE_LABELS } from "@/lib/rbac";
import { signOut } from "@/app/auth-actions";
import { dataMode } from "@/lib/env";
import type { AppUser } from "@/lib/types";
import type { NavItem } from "./nav-config";
import { MobileNav } from "./mobile-nav";

export function Topbar({ user, navItems }: { user: AppUser; navItems: NavItem[] }) {
  const mode = dataMode();
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-surface/85 px-3 backdrop-blur sm:px-5">
      <div className="flex min-w-0 items-center gap-2 text-sm text-muted">
        <MobileNav items={navItems} />
        {mode === "demo" ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/15 px-2.5 py-1 text-xs font-medium text-warning">
            Demo data mode
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success/12 px-2.5 py-1 text-xs font-medium text-success">
            Live · Supabase
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <Link
          href="/account"
          className="flex items-center gap-2 rounded-lg px-1 py-1 transition-colors hover:bg-surface-muted sm:gap-3"
        >
          <div className="hidden text-right leading-tight sm:block">
            <div className="text-sm font-medium text-foreground">{user.name}</div>
            <div className="text-[11px] text-muted">{ROLE_LABELS[user.role]}</div>
          </div>
          <Avatar name={user.name} color={user.avatarColor} size={34} />
        </Link>
        <form action={signOut}>
          <button
            type="submit"
            title="Sign out"
            className="rounded-lg p-2 text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
          >
            <LogOut size={17} />
          </button>
        </form>
      </div>
    </header>
  );
}

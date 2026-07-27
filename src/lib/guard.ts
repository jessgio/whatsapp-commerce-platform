import "server-only";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { can, homePathForRole, type Permission } from "@/lib/rbac";
import type { AppUser } from "@/lib/types";

/** Ensures the current user holds `permission`, else redirects. Returns the user. */
export async function requirePermission(permission: Permission): Promise<AppUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!can(user.role, permission)) redirect(homePathForRole(user.role));
  return user;
}

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { NAV_ITEMS } from "@/components/layout/nav-config";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const allowedNav = NAV_ITEMS.filter((item) => can(user.role, item.permission));

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar items={allowedNav} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={user} navItems={allowedNav} />
        <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-5 sm:py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}

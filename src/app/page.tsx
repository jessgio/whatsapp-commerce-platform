import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { homePathForRole } from "@/lib/rbac";

export default async function Home() {
  const user = await getCurrentUser();
  redirect(user ? homePathForRole(user.role) : "/login");
}

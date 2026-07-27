import Link from "next/link";
import { requirePermission } from "@/lib/guard";
import { can } from "@/lib/rbac";
import { listEmailFonts } from "@/lib/data/email-fonts";
import { PageHeader } from "@/components/ui";
import { EmailFontsManager } from "@/components/marketing/email-fonts-manager";

export default async function EmailFontsPage() {
  const user = await requirePermission("marketing.view");
  const fonts = await listEmailFonts();

  return (
    <div className="space-y-4">
      <div>
        <Link
          href="/marketing/design/email"
          className="text-sm text-muted hover:text-foreground"
        >
          ← Back to email templates
        </Link>
        <PageHeader
          title="Brand fonts"
          subtitle="Upload custom font packages for the email designer"
        />
      </div>
      <EmailFontsManager
        initial={fonts}
        canEdit={can(user.role, "marketing.edit")}
      />
    </div>
  );
}

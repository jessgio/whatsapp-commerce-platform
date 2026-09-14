import Link from "next/link";
import { requirePermission } from "@/lib/guard";
import { can } from "@/lib/rbac";
import { listEmailFonts } from "@/lib/data/email-fonts";
import { Button, PageHeader } from "@/components/ui";
import { ArrowLeft } from "lucide-react";
import { EmailFontsManager } from "@/components/marketing/email-fonts-manager";

export default async function EmailFontsPage() {
  const user = await requirePermission("marketing.view");
  const fonts = await listEmailFonts();

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <Link href="/marketing/design/email" className="inline-flex">
          <Button variant="secondary" className="h-8 px-2.5 text-xs">
            <ArrowLeft size={14} /> Back to email templates
          </Button>
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

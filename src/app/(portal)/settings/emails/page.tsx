import Link from "next/link";
import { requirePermission } from "@/lib/guard";
import { getLeadWelcomeTemplate } from "@/lib/data/email-templates";
import { PageHeader } from "@/components/ui";
import { EmailTemplateEditor } from "@/components/settings/email-template-editor";

export default async function EmailSettingsPage() {
  await requirePermission("settings.manage");
  const template = await getLeadWelcomeTemplate();

  return (
    <div className="space-y-4">
      <div>
        <Link href="/settings" className="text-sm text-muted hover:text-foreground">
          ← Back to settings
        </Link>
        <PageHeader
          title="Email designer"
          subtitle="Drag-and-drop blocks, upload banners, and preview the QR lead welcome email."
        />
      </div>
      <EmailTemplateEditor initial={template} />
    </div>
  );
}

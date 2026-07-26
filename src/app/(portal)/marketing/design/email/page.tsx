import Link from "next/link";
import { requirePermission } from "@/lib/guard";
import { getLeadWelcomeTemplate } from "@/lib/data/email-templates";
import { PageHeader } from "@/components/ui";
import { EmailTemplateEditor } from "@/components/settings/email-template-editor";

export default async function MarketingEmailDesignPage() {
  await requirePermission("marketing.view");
  const template = await getLeadWelcomeTemplate();

  return (
    <div className="space-y-4">
      <div>
        <Link
          href="/marketing/design"
          className="text-sm text-muted hover:text-foreground"
        >
          ← Back to marketing design
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

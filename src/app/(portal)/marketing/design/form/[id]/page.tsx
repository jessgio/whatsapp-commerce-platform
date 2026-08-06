import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/guard";
import { can } from "@/lib/rbac";
import { getFormTemplate } from "@/lib/data/form-templates";
import { getLeadWelcomeTemplate } from "@/lib/data/email-templates";
import { listEmailFonts } from "@/lib/data/email-fonts";
import { isQrLeadForm, QR_LEAD_FUNNEL } from "@/lib/qr-lead-funnel";
import { PageHeader } from "@/components/ui";
import { FormTemplateTabs } from "@/components/marketing/form-template-tabs";
import { DeleteFormTemplateButton } from "@/components/marketing/delete-form-template-button";

export default async function FormTemplateEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePermission("marketing.view");
  const canEdit = can(user.role, "marketing.edit");
  const { id } = await params;
  const template = await getFormTemplate(id);
  if (!template) notFound();

  const isFunnel = isQrLeadForm(template.id);
  const [welcomeEmail, fonts] = isFunnel
    ? await Promise.all([getLeadWelcomeTemplate(), listEmailFonts()])
    : [null, []];

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/marketing/design/form"
            className="text-sm text-muted hover:text-foreground"
          >
            ← Back to form templates
          </Link>
          <PageHeader
            title={isFunnel ? QR_LEAD_FUNNEL.label : template.name}
            subtitle={
              isFunnel
                ? `${QR_LEAD_FUNNEL.shortDescription} Live on join.aerisbeaute.com${QR_LEAD_FUNNEL.publicFormPath}.`
                : "Library template — not served on /daftar until promoted"
            }
          />
        </div>
        {canEdit && !isFunnel ? (
          <DeleteFormTemplateButton id={template.id} />
        ) : null}
      </div>

      <FormTemplateTabs
        template={template}
        canEdit={canEdit}
        welcomeEmail={welcomeEmail}
        customFonts={fonts}
      />
    </div>
  );
}

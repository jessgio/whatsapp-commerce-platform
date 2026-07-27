import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/guard";
import { can } from "@/lib/rbac";
import { getFormTemplate } from "@/lib/data/form-templates";
import { QR_LEAD_FORM_TEMPLATE_ID } from "@/lib/form-templates";
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

  const isQrLead = template.id === QR_LEAD_FORM_TEMPLATE_ID;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/marketing/design/form"
            className="text-sm text-muted hover:text-foreground"
          >
            ← Back to form templates
          </Link>
          <PageHeader
            title={template.name}
            subtitle={
              isQrLead
                ? "System template — live on join.aerisbeaute.com/daftar"
                : "Library template — not served on /daftar until promoted"
            }
          />
        </div>
        {canEdit && !isQrLead ? (
          <DeleteFormTemplateButton id={template.id} />
        ) : null}
      </div>

      <FormTemplateTabs template={template} canEdit={canEdit} />
    </div>
  );
}

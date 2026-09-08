import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/guard";
import { can } from "@/lib/rbac";
import { getFormTemplate } from "@/lib/data/form-templates";
import { getLeadWelcomeTemplate } from "@/lib/data/email-templates";
import { listEmailFonts } from "@/lib/data/email-fonts";
import { isQrLeadForm, QR_LEAD_FUNNEL } from "@/lib/qr-lead-funnel";
import { EditorPageShell } from "@/components/editor/editor-page-shell";
import { FormTemplateTabs } from "@/components/marketing/form-template-tabs";
import { DeleteFormTemplateButton } from "@/components/marketing/delete-form-template-button";
import { publicFormBaseUrl } from "@/lib/lead-edit";
import { isDigitalForm, digitalFormPath, jakartaDateFromIso } from "@/lib/digital-form";

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
  const digital = isDigitalForm(template);
  const sharePath = digital && template.publicSlug
    ? digitalFormPath(template.publicSlug)
    : null;
  const expiry = jakartaDateFromIso(template.expiresAt);
  const [welcomeEmail, fonts] = isFunnel
    ? await Promise.all([getLeadWelcomeTemplate(), listEmailFonts()])
    : [null, []];

  return (
    <EditorPageShell
      backHref="/marketing/design/form"
      backLabel="Form templates"
      title={isFunnel ? QR_LEAD_FUNNEL.label : template.name}
      actions={
        canEdit && !isFunnel ? (
          <DeleteFormTemplateButton id={template.id} name={template.name} />
        ) : null
      }
      meta={
        isFunnel ? (
          <>
            {QR_LEAD_FUNNEL.shortDescription} Live on join.aerisbeaute.com
            {QR_LEAD_FUNNEL.publicFormPath}
            {" · "}
            <Link
              href={QR_LEAD_FUNNEL.emailPath}
              className="text-merlot hover:underline"
            >
              Welcome email
            </Link>
            {template.discountCode ? (
              <>
                {" · "}
                <code className="font-mono">{template.discountCode}</code>
              </>
            ) : null}
          </>
        ) : (
          <>
            Form Digital
            {sharePath ? (
              <>
                {" · "}
                <Link href={sharePath} className="text-merlot hover:underline">
                  {sharePath}
                </Link>
              </>
            ) : null}
            {expiry ? ` · expires ${expiry}` : " · no expiry"}
            {template.isPublished ? "" : " · unpublished"}
          </>
        )
      }
    >
      <FormTemplateTabs
        template={template}
        canEdit={canEdit}
        welcomeEmail={welcomeEmail}
        customFonts={fonts}
        publicBaseUrl={publicFormBaseUrl()}
      />
    </EditorPageShell>
  );
}

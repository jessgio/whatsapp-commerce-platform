import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/guard";
import { getEmailTemplate } from "@/lib/data/email-templates";
import { getActiveFormTemplate } from "@/lib/data/form-templates";
import { listEmailFonts } from "@/lib/data/email-fonts";
import { EditorPageShell } from "@/components/editor/editor-page-shell";
import { EmailTemplateEditor } from "@/components/settings/email-template-editor";
import { saveEmailTemplateAction } from "@/app/(portal)/marketing/design/email/actions";
import { DeleteEmailTemplateButton } from "@/components/marketing/delete-email-template-button";
import {
  isQrLeadWelcomeEmail,
  QR_LEAD_FUNNEL,
} from "@/lib/qr-lead-funnel";

export default async function EmailTemplateEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("marketing.view");
  const { id } = await params;
  const [template, fonts] = await Promise.all([
    getEmailTemplate(id),
    listEmailFonts(),
  ]);
  if (!template) notFound();

  const isWelcome = isQrLeadWelcomeEmail(template.id);
  const formTemplate = isWelcome ? await getActiveFormTemplate() : null;
  const linkedDiscount = formTemplate?.discountCode;

  return (
    <EditorPageShell
      backHref="/marketing/design/email"
      backLabel="Email templates"
      title={template.name}
      actions={!isWelcome ? <DeleteEmailTemplateButton id={template.id} /> : null}
      meta={
        <>
          {isWelcome ? (
            <>
              System template · QR lead funnel
              {" · "}
              <Link
                href={QR_LEAD_FUNNEL.formPath}
                className="text-merlot hover:underline"
              >
                Open funnel
              </Link>
              {linkedDiscount ? (
                <>
                  {" · "}
                  <code className="font-mono">{linkedDiscount}</code>
                </>
              ) : null}
            </>
          ) : (
            "Campaign template · reusable in Campaigns"
          )}
          {" · "}
          <Link
            href="/marketing/design/email/fonts"
            className="text-merlot hover:underline"
          >
            Brand fonts
          </Link>
          {fonts.length ? ` (${fonts.length})` : ""}
        </>
      }
    >
      <EmailTemplateEditor
        initial={template}
        customFonts={fonts}
        heightClass="h-full min-h-0"
        discountCode={linkedDiscount ?? undefined}
        linkedDiscountCode={linkedDiscount ?? undefined}
        linkedDiscountHref={isWelcome ? QR_LEAD_FUNNEL.formPath : undefined}
        successMessage={
          isWelcome
            ? "Welcome template saved. New form submissions will use this design."
            : "Email template saved."
        }
        onSave={saveEmailTemplateAction}
      />
    </EditorPageShell>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/guard";
import { getEmailTemplate } from "@/lib/data/email-templates";
import { listEmailFonts } from "@/lib/data/email-fonts";
import { LEAD_WELCOME_TEMPLATE_ID } from "@/lib/email-templates";
import { PageHeader } from "@/components/ui";
import { EmailTemplateEditor } from "@/components/settings/email-template-editor";
import { saveEmailTemplateAction } from "@/app/(portal)/marketing/design/email/actions";
import { DeleteEmailTemplateButton } from "@/components/marketing/delete-email-template-button";

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

  const isWelcome = template.id === LEAD_WELCOME_TEMPLATE_ID;

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/marketing/design/email"
            className="text-sm text-muted hover:text-foreground"
          >
            ← Back to email templates
          </Link>
          <PageHeader
            title={template.name}
            subtitle={
              isWelcome
                ? "System template — sent to new joiners after the QR lead form"
                : "Campaign template — reusable in Marketing → Campaigns"
            }
          />
        </div>
        {!isWelcome ? <DeleteEmailTemplateButton id={template.id} /> : null}
      </div>

      <p className="shrink-0 text-xs text-muted">
        Brand fonts:{" "}
        <Link
          href="/marketing/design/email/fonts"
          className="text-merlot hover:underline"
        >
          manage uploads
        </Link>
        {fonts.length ? ` · ${fonts.length} available` : " · none uploaded yet"}
        . Custom fonts render in Apple Mail / iOS; Gmail and Outlook fall back to
        the paired system stack.
      </p>

      <EmailTemplateEditor
        initial={template}
        customFonts={fonts}
        heightClass="min-h-[520px] flex-1"
        successMessage={
          isWelcome
            ? "Welcome template saved. New form submissions will use this design."
            : "Email template saved."
        }
        onSave={saveEmailTemplateAction}
      />
    </div>
  );
}

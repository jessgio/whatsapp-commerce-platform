import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/guard";
import { getEmailTemplate } from "@/lib/data/email-templates";
import { getActiveFormTemplate } from "@/lib/data/form-templates";
import { listEmailFonts } from "@/lib/data/email-fonts";
import { PageHeader } from "@/components/ui";
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
                ? "System template — part of the QR lead funnel"
                : "Campaign template — reusable in Marketing → Campaigns"
            }
          />
        </div>
        {!isWelcome ? <DeleteEmailTemplateButton id={template.id} /> : null}
      </div>

      {isWelcome ? (
        <p className="shrink-0 rounded-lg border border-merlot/20 bg-merlot/5 px-3 py-2 text-xs leading-relaxed text-foreground">
          {QR_LEAD_FUNNEL.welcomeBanner}{" "}
          <Link
            href={QR_LEAD_FUNNEL.formPath}
            className="font-medium text-merlot hover:underline"
          >
            Open QR lead funnel
          </Link>
          {linkedDiscount ? (
            <>
              {" "}
              · Current code{" "}
              <code className="font-mono font-medium">{linkedDiscount}</code>
            </>
          ) : null}
        </p>
      ) : null}

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
    </div>
  );
}

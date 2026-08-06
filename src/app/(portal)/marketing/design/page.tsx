import Link from "next/link";
import {
  ClipboardList,
  Mail,
  MessageCircle,
  MousePointerClick,
  Route,
} from "lucide-react";
import { requirePermission } from "@/lib/guard";
import { can } from "@/lib/rbac";
import { listEmailTemplates } from "@/lib/data/email-templates";
import { getActiveFormTemplate, listFormTemplates } from "@/lib/data/form-templates";
import {
  listWaInteractiveDesigns,
  listWaTemplateDesigns,
} from "@/lib/data/whatsapp-designs";
import { QR_LEAD_FUNNEL } from "@/lib/qr-lead-funnel";
import { Card, CardBody, CardHeader, CardTitle, PageHeader } from "@/components/ui";

export default async function MarketingDesignPage() {
  const user = await requirePermission("marketing.view");
  const canEdit = can(user.role, "marketing.edit");
  const [emails, templates, interactive, forms, qrForm] = await Promise.all([
    listEmailTemplates(),
    listWaTemplateDesigns(),
    listWaInteractiveDesigns(),
    listFormTemplates(),
    getActiveFormTemplate(),
  ]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Marketing design"
        subtitle="Forms, email templates, and WhatsApp message designs"
      />

      <Card className="border-merlot/25 bg-merlot/[0.03]">
        <CardHeader>
          <CardTitle>{QR_LEAD_FUNNEL.label}</CardTitle>
          <Link
            href={QR_LEAD_FUNNEL.formPath}
            className="text-xs font-medium text-merlot hover:underline"
          >
            {canEdit ? "Open funnel" : "View"}
          </Link>
        </CardHeader>
        <CardBody className="flex items-start gap-3 pt-0">
          <span className="mt-0.5 text-merlot">
            <Route size={18} />
          </span>
          <div>
            <p className="text-sm text-foreground">
              {QR_LEAD_FUNNEL.shortDescription} Edit form fields, thank-you
              page, and welcome email in one place — including the discount
              code.
            </p>
            <p className="mt-1 text-xs text-muted">
              Discount{" "}
              <code className="font-mono text-foreground">
                {qrForm.discountCode}
              </code>
              {" · "}
              Form → Thank you → Welcome email
            </p>
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Form library</CardTitle>
            <Link
              href="/marketing/design/form"
              className="text-xs font-medium text-merlot hover:underline"
            >
              {canEdit ? "Manage" : "View"}
            </Link>
          </CardHeader>
          <CardBody className="flex items-start gap-3 pt-0">
            <span className="mt-0.5 text-merlot">
              <ClipboardList size={18} />
            </span>
            <div>
              <p className="text-sm text-foreground">
                All form templates, including drafts. The live QR signup flow
                lives in the funnel above.
              </p>
              <p className="mt-1 text-xs text-muted">
                {forms.length} template{forms.length === 1 ? "" : "s"}
              </p>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Email library</CardTitle>
            <Link
              href="/marketing/design/email"
              className="text-xs font-medium text-merlot hover:underline"
            >
              {canEdit ? "Manage" : "View"}
            </Link>
          </CardHeader>
          <CardBody className="flex items-start gap-3 pt-0">
            <span className="mt-0.5 text-merlot">
              <Mail size={18} />
            </span>
            <div>
              <p className="text-sm text-foreground">
                Campaign and nurture templates, plus brand fonts. The QR welcome
                email is edited in the funnel above (also listed here).
              </p>
              <p className="mt-1 text-xs text-muted">
                {emails.length} template{emails.length === 1 ? "" : "s"}
              </p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>WhatsApp templates</CardTitle>
            <Link
              href="/marketing/design/whatsapp/templates"
              className="text-xs font-medium text-merlot hover:underline"
            >
              Manage
            </Link>
          </CardHeader>
          <CardBody className="flex items-start gap-3 pt-0">
            <span className="mt-0.5 text-merlot">
              <MessageCircle size={18} />
            </span>
            <div>
              <p className="text-sm text-foreground">
                Meta-compliant template composer for scheduled broadcasts outside
                the 24h window.
              </p>
              <p className="mt-1 text-xs text-muted">
                {templates.length} design{templates.length === 1 ? "" : "s"}
              </p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>WhatsApp interactive</CardTitle>
            <Link
              href="/marketing/design/whatsapp/interactive"
              className="text-xs font-medium text-merlot hover:underline"
            >
              Manage
            </Link>
          </CardHeader>
          <CardBody className="flex items-start gap-3 pt-0">
            <span className="mt-0.5 text-merlot">
              <MousePointerClick size={18} />
            </span>
            <div>
              <p className="text-sm text-foreground">
                Session messages with reply buttons and lists — for in-window
                follow-ups only.
              </p>
              <p className="mt-1 text-xs text-muted">
                {interactive.length} design{interactive.length === 1 ? "" : "s"}
              </p>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

import Link from "next/link";
import { ClipboardList, Mail, MessageCircle, MousePointerClick } from "lucide-react";
import { requirePermission } from "@/lib/guard";
import { can } from "@/lib/rbac";
import { listEmailTemplates } from "@/lib/data/email-templates";
import { listFormTemplates } from "@/lib/data/form-templates";
import {
  listWaInteractiveDesigns,
  listWaTemplateDesigns,
} from "@/lib/data/whatsapp-designs";
import { Card, CardBody, CardHeader, CardTitle, PageHeader } from "@/components/ui";

export default async function MarketingDesignPage() {
  const user = await requirePermission("marketing.view");
  const canEdit = can(user.role, "marketing.edit");
  const [emails, templates, interactive, forms] = await Promise.all([
    listEmailTemplates(),
    listWaTemplateDesigns(),
    listWaInteractiveDesigns(),
    listFormTemplates(),
  ]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Marketing design"
        subtitle="Forms, email templates, and WhatsApp message designs"
      />

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Form</CardTitle>
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
                QR lead form builder and thank-you landing page — same block
                editor as email for the post-submit screen.
              </p>
              <p className="mt-1 text-xs text-muted">
                {forms.length} template{forms.length === 1 ? "" : "s"}
              </p>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Email</CardTitle>
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
                Template library with the same drag-and-drop editor — welcome,
                nurture, and campaign emails, plus brand fonts.
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

import Link from "next/link";
import { Mail, MessageCircle, MousePointerClick } from "lucide-react";
import { requirePermission } from "@/lib/guard";
import { can } from "@/lib/rbac";
import { getLeadWelcomeTemplate } from "@/lib/data/email-templates";
import {
  listWaInteractiveDesigns,
  listWaTemplateDesigns,
} from "@/lib/data/whatsapp-designs";
import { Card, CardBody, CardHeader, CardTitle, PageHeader } from "@/components/ui";

export default async function MarketingDesignPage() {
  const user = await requirePermission("marketing.view");
  const canEdit = can(user.role, "marketing.edit");
  const [email, templates, interactive] = await Promise.all([
    getLeadWelcomeTemplate(),
    listWaTemplateDesigns(),
    listWaInteractiveDesigns(),
  ]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Marketing design"
        subtitle="Email templates and WhatsApp message designs for campaigns"
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Email</CardTitle>
            {canEdit ? (
              <Link
                href="/marketing/design/email"
                className="text-xs font-medium text-merlot hover:underline"
              >
                Open editor
              </Link>
            ) : (
              <Link
                href="/marketing/design/email"
                className="text-xs font-medium text-merlot hover:underline"
              >
                View
              </Link>
            )}
          </CardHeader>
          <CardBody className="flex items-start gap-3 pt-0">
            <span className="mt-0.5 text-merlot">
              <Mail size={18} />
            </span>
            <div>
              <p className="text-sm text-foreground">
                Drag-and-drop email builder for lead welcome and email campaigns.
              </p>
              <p className="mt-1 text-xs text-muted">
                {email.subject
                  ? `Lead welcome · ${email.subject}`
                  : "No subject set yet"}
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

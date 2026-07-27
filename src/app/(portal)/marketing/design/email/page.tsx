import Link from "next/link";
import { Plus, Type } from "lucide-react";
import { requirePermission } from "@/lib/guard";
import { can } from "@/lib/rbac";
import { listEmailTemplates } from "@/lib/data/email-templates";
import { listEmailFonts } from "@/lib/data/email-fonts";
import { LEAD_WELCOME_TEMPLATE_ID } from "@/lib/email-templates";
import { Badge, Button, PageHeader } from "@/components/ui";
import { CreateEmailTemplateButton } from "@/components/marketing/create-email-template-button";

export default async function EmailTemplatesListPage() {
  const user = await requirePermission("marketing.view");
  const canEdit = can(user.role, "marketing.edit");
  const [templates, fonts] = await Promise.all([
    listEmailTemplates(),
    listEmailFonts(),
  ]);

  return (
    <div>
      <PageHeader
        title="Email templates"
        subtitle="Design library for welcome, nurture, and campaign emails"
        actions={
          canEdit ? (
            <div className="flex flex-wrap gap-2">
              <Link href="/marketing/design/email/fonts">
                <Button variant="secondary">
                  <Type size={15} /> Brand fonts ({fonts.length})
                </Button>
              </Link>
              <CreateEmailTemplateButton />
            </div>
          ) : (
            <Link href="/marketing/design/email/fonts">
              <Button variant="secondary">
                <Type size={15} /> Brand fonts
              </Button>
            </Link>
          )
        }
      />

      <div className="mb-4 text-sm">
        <Link href="/marketing/design" className="text-merlot hover:underline">
          ← Back to marketing design
        </Link>
      </div>

      {templates.length === 0 ? (
        <div className="rounded-[16px] border border-dashed border-border bg-surface px-6 py-12 text-center">
          <p className="text-sm font-medium text-foreground">No email templates</p>
          {canEdit ? (
            <div className="mt-4 inline-block">
              <CreateEmailTemplateButton label="Create template" />
            </div>
          ) : null}
        </div>
      ) : (
        <div className="overflow-hidden rounded-[16px] border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-surface-muted/50 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Template</th>
                <th className="px-4 py-3 font-medium">Subject</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => (
                <tr
                  key={t.id}
                  className="border-b border-border last:border-0 hover:bg-surface-muted/40"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/marketing/design/email/${t.id}`}
                      className="font-medium text-foreground hover:text-merlot"
                    >
                      {t.name}
                    </Link>
                    {t.description ? (
                      <p className="mt-0.5 text-xs text-muted">{t.description}</p>
                    ) : null}
                  </td>
                  <td className="max-w-[280px] truncate px-4 py-3 text-muted">
                    {t.subject}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      tone={
                        t.id === LEAD_WELCOME_TEMPLATE_ID || t.kind === "system"
                          ? "merlot"
                          : "neutral"
                      }
                    >
                      {t.id === LEAD_WELCOME_TEMPLATE_ID || t.kind === "system"
                        ? "Welcome / system"
                        : "Campaign"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {t.updatedAt
                      ? new Date(t.updatedAt).toLocaleString()
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {canEdit ? (
        <p className="mt-3 text-xs text-muted">
          <Plus size={12} className="mr-1 inline" />
          New campaign templates share the same drag-and-drop editor as the lead
          welcome email. Upload brand fonts under Brand fonts.
        </p>
      ) : null}
    </div>
  );
}

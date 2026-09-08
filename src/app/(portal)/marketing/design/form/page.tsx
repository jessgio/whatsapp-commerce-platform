import Link from "next/link";
import { requirePermission } from "@/lib/guard";
import { can } from "@/lib/rbac";
import { listFormTemplates } from "@/lib/data/form-templates";
import { QR_LEAD_FORM_TEMPLATE_ID } from "@/lib/form-templates";
import { QR_LEAD_FUNNEL } from "@/lib/qr-lead-funnel";
import { digitalFormPath, jakartaDateFromIso } from "@/lib/digital-form";
import { Button, PageHeader } from "@/components/ui";
import { ArrowLeft } from "lucide-react";
import { createFormTemplateAction } from "@/app/(portal)/marketing/design/form/actions";
import { DeleteFormTemplateButton } from "@/components/marketing/delete-form-template-button";
import { redirect } from "next/navigation";

export default async function FormTemplatesListPage() {
  const user = await requirePermission("marketing.view");
  const canEdit = can(user.role, "marketing.edit");
  const templates = await listFormTemplates();

  async function createAction() {
    "use server";
    const res = await createFormTemplateAction();
    if (res.ok && res.id) redirect(`/marketing/design/form/${res.id}`);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-3">
          <Link href="/marketing/design" className="inline-flex">
            <Button variant="secondary" className="h-8 px-2.5 text-xs">
              <ArrowLeft size={14} /> Back to design
            </Button>
          </Link>
          <PageHeader
            title="Form templates"
            subtitle="QR lead form, Form Digital share links with expiry and QR, and thank-you pages"
          />
        </div>
        {canEdit ? (
          <form action={createAction}>
            <Button type="submit">New form template</Button>
          </form>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-[14px] border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-surface-muted/50 text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Kind</th>
              <th className="px-4 py-3 font-medium">Fields</th>
              <th className="px-4 py-3 font-medium">Updated</th>
              {canEdit ? (
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {templates.map((t) => (
              <tr
                key={t.id}
                className="border-b border-border last:border-0 hover:bg-surface-muted/30"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/marketing/design/form/${t.id}`}
                    className="font-medium text-foreground hover:text-merlot"
                  >
                    {t.name}
                  </Link>
                  {t.id === QR_LEAD_FORM_TEMPLATE_ID ? (
                    <p className="text-xs text-muted">
                      {QR_LEAD_FUNNEL.label} — form, thank-you, and welcome email
                    </p>
                  ) : (
                    <p className="text-xs text-muted">
                      {t.publicSlug
                        ? digitalFormPath(t.publicSlug)
                        : "Save to generate a public link"}
                      {t.expiresAt
                        ? ` · expires ${jakartaDateFromIso(t.expiresAt)}`
                        : " · no expiry"}
                      {t.isPublished ? "" : " · unpublished"}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 text-muted">
                  {t.kind === "system" ? "System" : "Form Digital"}
                </td>
                <td className="px-4 py-3 text-muted">{t.fields.length}</td>
                <td className="px-4 py-3 text-muted">
                  {t.updatedAt
                    ? new Date(t.updatedAt).toLocaleString()
                    : "—"}
                </td>
                {canEdit ? (
                  <td className="px-4 py-3 text-right">
                    {t.id === QR_LEAD_FORM_TEMPLATE_ID ? (
                      <span className="text-xs text-muted">—</span>
                    ) : (
                      <DeleteFormTemplateButton id={t.id} name={t.name} compact />
                    )}
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

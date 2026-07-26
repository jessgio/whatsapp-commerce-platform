import Link from "next/link";
import { Plus } from "lucide-react";
import { requirePermission } from "@/lib/guard";
import { can } from "@/lib/rbac";
import { listWaTemplateDesigns } from "@/lib/data/whatsapp-designs";
import { Button, PageHeader } from "@/components/ui";

export default async function WaTemplatesListPage() {
  const user = await requirePermission("marketing.view");
  const canEdit = can(user.role, "marketing.edit");
  const templates = await listWaTemplateDesigns();

  return (
    <div>
      <PageHeader
        title="WhatsApp templates"
        subtitle="Meta-approved structure for scheduled segment broadcasts"
        actions={
          canEdit ? (
            <Link href="/marketing/design/whatsapp/templates/new">
              <Button>
                <Plus size={15} /> New template
              </Button>
            </Link>
          ) : undefined
        }
      />

      <div className="mb-4 text-sm">
        <Link href="/marketing/design" className="text-merlot hover:underline">
          ← Back to marketing design
        </Link>
      </div>

      {templates.length === 0 ? (
        <div className="rounded-[16px] border border-dashed border-border bg-surface px-6 py-12 text-center">
          <p className="text-sm font-medium text-foreground">No templates yet</p>
          <p className="mt-1 text-sm text-muted">
            Create a template design that maps to an approved Meta template name.
          </p>
          {canEdit && (
            <Link
              href="/marketing/design/whatsapp/templates/new"
              className="mt-4 inline-block"
            >
              <Button>Create template</Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-[16px] border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-surface-muted/50 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Meta name</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Language</th>
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
                      href={`/marketing/design/whatsapp/templates/${t.id}`}
                      className="font-medium text-foreground hover:text-merlot"
                    >
                      {t.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted">
                    {t.metaTemplateName}
                  </td>
                  <td className="px-4 py-3 text-muted">{t.category}</td>
                  <td className="px-4 py-3 text-muted">{t.languageCode}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

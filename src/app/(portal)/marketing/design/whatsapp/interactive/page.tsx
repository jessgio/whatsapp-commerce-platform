import Link from "next/link";
import { Plus } from "lucide-react";
import { requirePermission } from "@/lib/guard";
import { can } from "@/lib/rbac";
import { listWaInteractiveDesigns } from "@/lib/data/whatsapp-designs";
import { Button, PageHeader } from "@/components/ui";

export default async function WaInteractiveListPage() {
  const user = await requirePermission("marketing.view");
  const canEdit = can(user.role, "marketing.edit");
  const designs = await listWaInteractiveDesigns();

  return (
    <div>
      <PageHeader
        title="WhatsApp interactive"
        subtitle="Session messages for the 24-hour customer care window"
        actions={
          canEdit ? (
            <Link href="/marketing/design/whatsapp/interactive/new">
              <Button>
                <Plus size={15} /> New design
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

      {designs.length === 0 ? (
        <div className="rounded-[16px] border border-dashed border-border bg-surface px-6 py-12 text-center">
          <p className="text-sm font-medium text-foreground">No interactive designs yet</p>
          <p className="mt-1 text-sm text-muted">
            Build reply-button or list messages for in-session follow-ups.
          </p>
          {canEdit && (
            <Link
              href="/marketing/design/whatsapp/interactive/new"
              className="mt-4 inline-block"
            >
              <Button>Create design</Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-[16px] border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-surface-muted/50 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Type</th>
              </tr>
            </thead>
            <tbody>
              {designs.map((d) => (
                <tr
                  key={d.id}
                  className="border-b border-border last:border-0 hover:bg-surface-muted/40"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/marketing/design/whatsapp/interactive/${d.id}`}
                      className="font-medium text-foreground hover:text-merlot"
                    >
                      {d.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted">{d.kind}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

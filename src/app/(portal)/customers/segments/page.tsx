import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { requirePermission } from "@/lib/guard";
import { can } from "@/lib/rbac";
import { countSegmentMembers } from "@/lib/data/segment-members";
import { listSegmentDefinitions } from "@/lib/data/segments";
import { summarizeCondition } from "@/lib/segments";
import { Button, PageHeader } from "@/components/ui";

export default async function CustomerSegmentsPage() {
  const user = await requirePermission("customers.view");
  const segments = await listSegmentDefinitions();
  // Counted in Postgres, in parallel. Doing it in JS meant loading every
  // customer and re-scanning the list once per segment.
  const counts = await Promise.all(
    segments.map((seg) => countSegmentMembers(seg.rules)),
  );
  const canEdit = can(user.role, "customers.edit");

  return (
    <div>
      <PageHeader
        title="Customer segments"
        subtitle="Rule-based audiences for city, age, order value, recency, and more"
        actions={
          canEdit ? (
            <Link href="/customers/segments/new">
              <Button>
                <Plus size={15} /> New segment
              </Button>
            </Link>
          ) : undefined
        }
      />

      <Link href="/customers" className="mb-6 inline-flex">
        <Button variant="secondary" className="h-8 px-2.5 text-xs">
          <ArrowLeft size={14} /> Back to customers
        </Button>
      </Link>

      {segments.length === 0 ? (
        <div className="rounded-[16px] border border-dashed border-border bg-surface px-6 py-12 text-center">
          <p className="text-sm font-medium text-foreground">No segments yet</p>
          <p className="mt-1 text-sm text-muted">
            Create your first audience for campaigns and CRM filtering.
          </p>
          {canEdit && (
            <Link href="/customers/segments/new" className="mt-4 inline-block">
              <Button>Create segment</Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-[16px] border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-surface-muted/50 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Segment</th>
                <th className="px-4 py-3 font-medium">Rules</th>
                <th className="px-4 py-3 font-medium text-right">Members</th>
              </tr>
            </thead>
            <tbody>
              {segments.map((seg, i) => {
                const count = counts[i];
                return (
                  <tr
                    key={seg.id}
                    className="border-b border-border last:border-0 hover:bg-surface-muted/40"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/customers/segments/${seg.id}`}
                        className="font-medium text-foreground hover:text-merlot"
                      >
                        {seg.name}
                      </Link>
                      {seg.description && (
                        <p className="mt-0.5 text-xs text-muted">{seg.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">
                      <span className="mr-1 rounded bg-beige-200 px-1.5 py-0.5 text-[10px] uppercase text-brown">
                        {seg.rules.match}
                      </span>
                      {seg.rules.conditions
                        .slice(0, 3)
                        .map((c) => summarizeCondition(c))
                        .join(" · ")}
                      {seg.rules.conditions.length > 3
                        ? ` · +${seg.rules.conditions.length - 3}`
                        : ""}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{count}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

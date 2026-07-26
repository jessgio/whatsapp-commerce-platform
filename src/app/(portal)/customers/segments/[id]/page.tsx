import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/guard";
import { can } from "@/lib/rbac";
import { listCustomers } from "@/lib/data/repo";
import { getSegmentDefinition } from "@/lib/data/segments";
import { filterCustomersByRules } from "@/lib/segments";
import { Avatar, PageHeader, Table, Td, Th } from "@/components/ui";
import { SegmentBuilder } from "@/components/customers/segment-builder";
import { formatDate, formatIDRCompact } from "@/lib/format";

export default async function CustomerSegmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePermission("customers.view");
  const { id } = await params;
  const [segment, customers] = await Promise.all([
    getSegmentDefinition(id),
    listCustomers(),
  ]);
  if (!segment) notFound();

  const canEdit = can(user.role, "customers.edit");
  const canSeePii = can(user.role, "customers.pii");
  const members = filterCustomersByRules(customers, segment.rules);

  return (
    <div>
      <PageHeader
        title={segment.name}
        subtitle={segment.description ?? "Dynamic customer segment"}
      />
      <div className="mb-6 text-sm">
        <Link href="/customers/segments" className="text-merlot hover:underline">
          ← All segments
        </Link>
      </div>

      <div className="mb-10">
        <SegmentBuilder
          initial={segment}
          customers={customers}
          canEdit={canEdit}
        />
      </div>

      <h2 className="mb-3 text-sm font-semibold text-foreground">
        Matching customers ({members.length})
      </h2>
      <Table>
        <thead>
          <tr>
            <Th>Customer</Th>
            <Th className="text-right">Orders</Th>
            <Th className="text-right">LTV</Th>
            <Th>Last order</Th>
          </tr>
        </thead>
        <tbody>
          {members.slice(0, 100).map((c) => (
            <tr key={c.id} className="hover:bg-surface-muted">
              <Td>
                <Link
                  href={`/customers/${c.id}`}
                  className="flex items-center gap-3"
                >
                  <Avatar name={c.name} color="#6f2c3f" size={32} />
                  <div>
                    <div className="text-sm font-medium">{c.name}</div>
                    <div className="text-xs text-muted">
                      {canSeePii ? c.phone : "••••"} · {c.city ?? "—"}
                    </div>
                  </div>
                </Link>
              </Td>
              <Td className="text-right text-sm">{c.orderCount}</Td>
              <Td className="text-right text-sm">
                {formatIDRCompact(c.lifetimeValue)}
              </Td>
              <Td className="text-sm text-muted">
                {c.lastOrderAt ? formatDate(c.lastOrderAt) : "—"}
              </Td>
            </tr>
          ))}
          {members.length === 0 && (
            <tr>
              <Td colSpan={4}>
                <p className="py-6 text-center text-sm text-muted">
                  No customers match these rules yet.
                </p>
              </Td>
            </tr>
          )}
        </tbody>
      </Table>
    </div>
  );
}

import Link from "next/link";
import { requirePermission } from "@/lib/guard";
import { listCases } from "@/lib/data/repo";
import { Avatar, PageHeader, Table, Th, Td } from "@/components/ui";
import { CaseStatusBadge, PriorityBadge } from "@/components/status";
import { timeAgo } from "@/lib/format";

export default async function CasesPage() {
  await requirePermission("cases.view");
  const cases = await listCases();
  const sorted = [...cases].sort((a, b) => {
    const order = { urgent: 0, high: 1, medium: 2, low: 3 };
    return order[a.priority] - order[b.priority];
  });

  return (
    <div>
      <PageHeader
        title="Cases"
        subtitle="Flagged issues and complaints with ownership and SLA"
      />
      <Table>
        <thead>
          <tr>
            <Th>Case</Th>
            <Th>Customer</Th>
            <Th>Subject</Th>
            <Th>Priority</Th>
            <Th>Status</Th>
            <Th>Owner</Th>
            <Th>Updated</Th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((c) => (
            <tr key={c.id} className="hover:bg-surface-muted">
              <Td className="text-sm font-medium text-merlot">{c.code}</Td>
              <Td>
                <Link href={`/customers/${c.customerId}`} className="text-sm text-foreground hover:underline">
                  {c.customerName}
                </Link>
              </Td>
              <Td className="max-w-xs">
                <span className="text-sm text-foreground">{c.subject}</span>
                {c.orderId && (
                  <Link href={`/orders/${c.orderId}`} className="ml-1 text-xs text-muted hover:underline">
                    (order)
                  </Link>
                )}
              </Td>
              <Td><PriorityBadge priority={c.priority} /></Td>
              <Td><CaseStatusBadge status={c.status} /></Td>
              <Td>
                {c.ownerName ? (
                  <span className="flex items-center gap-2">
                    <Avatar name={c.ownerName} size={24} color="#3a5a7a" />
                    <span className="text-sm text-foreground">{c.ownerName}</span>
                  </span>
                ) : (
                  <span className="text-xs font-medium text-warning">Unassigned</span>
                )}
              </Td>
              <Td className="text-sm text-muted">{timeAgo(c.updatedAt)}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}

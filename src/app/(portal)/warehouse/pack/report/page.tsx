import Link from "next/link";
import { Download, FileText } from "lucide-react";
import { requirePermission } from "@/lib/guard";
import { getPackReportSummary, listPackSessions } from "@/lib/data/repo";
import { Badge, PageHeader, StatCard, Table, Th, Td } from "@/components/ui";
import { formatDateTime, formatNumber } from "@/lib/format";

function durationLabel(start: string, end: string | null): string {
  if (!end) return "—";
  const secs = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 1000);
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default async function PackReportPage() {
  await requirePermission("warehouse.view");
  // Totals are aggregated in Postgres over the whole history; the table below
  // is only the most recent page of sessions.
  const [sessions, summary] = await Promise.all([
    listPackSessions(),
    getPackReportSummary(),
  ]);

  return (
    <div>
      <PageHeader
        title="Pack Report"
        subtitle="Throughput and accountability — who packed what, and when"
        actions={
          <div className="flex gap-2">
            <Link
              href="/api/warehouse/pack-report"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:bg-merlot-600"
            >
              <Download size={15} /> Summary CSV
            </Link>
            <Link
              href="/api/warehouse/pack-report?detail=1"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3.5 py-2 text-sm font-medium text-foreground hover:bg-surface-muted"
            >
              <FileText size={15} /> Scan-level CSV
            </Link>
          </div>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Pack sessions" value={formatNumber(summary.sessions)} />
        <StatCard label="Completed" value={formatNumber(summary.completed)} />
        <StatCard label="Avg pack time" value={`${summary.avgPackSeconds}s`} />
        <StatCard label="Units scanned" value={formatNumber(summary.unitsScanned)} />
      </div>

      {summary.sessions > sessions.length && (
        <p className="mb-3 text-xs text-muted">
          Showing the {formatNumber(sessions.length)} most recent of{" "}
          {formatNumber(summary.sessions)} sessions. Use the CSV exports for the
          full history.
        </p>
      )}

      <Table>
        <thead>
          <tr>
            <Th>Order</Th>
            <Th>Label / AWB</Th>
            <Th>Packer</Th>
            <Th>Status</Th>
            <Th>Started</Th>
            <Th>Completed</Th>
            <Th className="text-right">Duration</Th>
            <Th className="text-right">Units</Th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((s) => (
            <tr key={s.id} className="hover:bg-surface-muted">
              <Td>
                <Link href={`/orders/${s.orderId}`} className="text-sm font-medium text-merlot hover:underline">
                  {s.orderCode}
                </Link>
              </Td>
              <Td className="font-mono text-xs text-muted">{s.labelNumber}</Td>
              <Td className="text-sm text-foreground">{s.packerName}</Td>
              <Td>
                <Badge tone={s.status === "completed" ? "success" : "warning"}>
                  {s.status === "completed" ? "Completed" : "In progress"}
                </Badge>
              </Td>
              <Td className="text-sm text-muted">{formatDateTime(s.startedAt)}</Td>
              <Td className="text-sm text-muted">{s.completedAt ? formatDateTime(s.completedAt) : "—"}</Td>
              <Td className="text-right text-sm font-medium">{durationLabel(s.startedAt, s.completedAt)}</Td>
              <Td className="text-right text-sm">{s.scans.length}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}

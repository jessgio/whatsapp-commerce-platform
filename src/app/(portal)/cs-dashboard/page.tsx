import { Clock, MessageCircle, TicketCheck, AlertTriangle } from "lucide-react";
import { requirePermission } from "@/lib/guard";
import { listCases, listConversations } from "@/lib/data/repo";
import { computeCsMetrics } from "@/lib/data/analytics";
import { formatNumber } from "@/lib/format";
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  PageHeader,
  StatCard,
} from "@/components/ui";
import { MiniBars } from "@/components/charts";

export default async function CsDashboardPage() {
  await requirePermission("dashboard.cs");
  const [conversations, cases] = await Promise.all([listConversations(), listCases()]);
  const m = computeCsMetrics(conversations, cases);

  return (
    <div>
      <PageHeader
        title="Customer Service Dashboard"
        subtitle="Live workload, response times and case ownership"
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Active cases" value={formatNumber(m.activeCases)} icon={<TicketCheck size={16} />} />
        <StatCard label="Active chats" value={formatNumber(m.activeChats)} hint={`${m.unassignedChats} unassigned`} icon={<MessageCircle size={16} />} />
        <StatCard label="Avg first response" value={`${m.avgFirstResponseMin} min`} icon={<Clock size={16} />} />
        <StatCard label="SLA breaches" value={formatNumber(m.slaBreaches)} hint=">10 min to first reply" icon={<AlertTriangle size={16} />} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Open cases by owner</CardTitle>
            <span className="text-xs text-muted">Who is in charge of what</span>
          </CardHeader>
          <CardBody className="space-y-1 pt-0">
            {m.byOwner.map((o) => {
              const max = Math.max(...m.byOwner.map((x) => x.open), 1);
              return (
                <div key={o.name} className="flex items-center gap-3 py-1.5">
                  <span className="w-32 truncate text-sm text-foreground">{o.name}</span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-beige-200">
                    <div
                      className="h-full rounded-full bg-merlot"
                      style={{ width: `${(o.open / max) * 100}%` }}
                    />
                  </div>
                  <span className="w-6 text-right text-sm font-medium text-foreground">{o.open}</span>
                </div>
              );
            })}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Open cases by priority</CardTitle>
          </CardHeader>
          <CardBody>
            <MiniBars data={m.byPriority} />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

import { TrendingUp, TrendingDown, Users, ShoppingBag, Repeat, Wallet } from "lucide-react";
import { requirePermission } from "@/lib/guard";
import { getSalesMetrics } from "@/lib/data/analytics";
import { formatIDRCompact, formatNumber } from "@/lib/format";
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  PageHeader,
  StatCard,
} from "@/components/ui";
import { RevenueTrend, CategoryBars } from "@/components/charts-lazy";

export default async function DashboardPage() {
  await requirePermission("dashboard.sales");
  const m = await getSalesMetrics();

  return (
    <div>
      <PageHeader
        title="Sales Dashboard"
        subtitle="Performance across the WhatsApp commerce channel · last 30 days"
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Revenue (30d)"
          value={formatIDRCompact(m.revenue30d)}
          delta={m.revenueGrowthPct}
          hint="vs prev 30d"
          icon={<Wallet size={16} />}
        />
        <StatCard
          label="Orders (30d)"
          value={formatNumber(m.orders30d)}
          hint={`AOV ${formatIDRCompact(m.avgOrderValue)}`}
          icon={<ShoppingBag size={16} />}
        />
        <StatCard
          label="Customers"
          value={formatNumber(m.totalCustomers)}
          hint={`+${m.newCustomers30d} new (30d)`}
          icon={<Users size={16} />}
        />
        <StatCard
          label="Retention rate"
          value={`${m.retentionRatePct.toFixed(0)}%`}
          hint={`Repeat ${m.repeatRatePct.toFixed(0)}%`}
          icon={<Repeat size={16} />}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue trend</CardTitle>
            <span className="text-xs text-muted">Paid orders · last 14 days</span>
          </CardHeader>
          <CardBody>
            <RevenueTrend data={m.revenueByDay} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue by category</CardTitle>
          </CardHeader>
          <CardBody>
            <CategoryBars data={m.revenueByCategory} />
          </CardBody>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5">
              <TrendingUp size={15} className="text-success" /> Growing SKUs
            </CardTitle>
          </CardHeader>
          <CardBody className="space-y-2 pt-0">
            {m.topGrowing.map((p) => (
              <SkuRow key={p.sku} {...p} positive />
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5">
              <TrendingDown size={15} className="text-danger" /> Declining SKUs
            </CardTitle>
          </CardHeader>
          <CardBody className="space-y-2 pt-0">
            {m.topDeclining.map((p) => (
              <SkuRow key={p.sku} {...p} positive={false} />
            ))}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function SkuRow({
  name,
  sku,
  units,
  growthPct,
  positive,
}: {
  name: string;
  sku: string;
  units: number;
  growthPct: number;
  positive: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg px-2 py-2 hover:bg-surface-muted">
      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-foreground">{name}</div>
        <div className="text-xs text-muted">{sku} · {formatNumber(units)} sold</div>
      </div>
      <span className={`text-sm font-semibold ${positive ? "text-success" : "text-danger"}`}>
        {positive ? "+" : ""}
        {growthPct.toFixed(0)}%
      </span>
    </div>
  );
}

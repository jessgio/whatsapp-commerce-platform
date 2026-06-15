import Link from "next/link";
import { Download } from "lucide-react";
import { requirePermission } from "@/lib/guard";
import { listPackableOrders } from "@/lib/data/repo";
import { PageHeader } from "@/components/ui";
import { PackStation } from "@/components/warehouse/pack-station";

export default async function PackStationPage() {
  await requirePermission("warehouse.view");
  const orders = await listPackableOrders();
  const packable = orders.map((o) => ({
    code: o.code,
    label: o.labelNumber!,
    customer: o.customerName,
    units: o.items.reduce((s, i) => s + i.qty, 0),
  }));

  return (
    <div>
      <PageHeader
        title="Pack Station"
        subtitle="Scan the label, then scan each product to verify and log the pack"
        actions={
          <Link
            href="/api/warehouse/pack-report"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3.5 py-2 text-sm font-medium text-foreground hover:bg-surface-muted"
          >
            <Download size={15} /> Pack report
          </Link>
        }
      />
      <PackStation packable={packable} />
    </div>
  );
}

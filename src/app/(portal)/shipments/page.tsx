import Link from "next/link";
import { Truck, Package } from "lucide-react";
import { requirePermission } from "@/lib/guard";
import { listShipments } from "@/lib/data/repo";
import { Card, CardBody, PageHeader, StatCard } from "@/components/ui";
import { ShipmentBadge } from "@/components/status";
import { formatIDR, formatDateTime, formatNumber } from "@/lib/format";

export default async function ShipmentsPage() {
  await requirePermission("shipments.view");
  const shipments = await listShipments();

  const inTransit = shipments.filter((s) => s.status === "in_transit" || s.status === "picked_up").length;
  const delivered = shipments.filter((s) => s.status === "delivered").length;

  return (
    <div>
      <PageHeader
        title="Shipments"
        subtitle="3PL tracking via Biteship — SiCepat, J&T, JNE, Anteraja"
      />

      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total shipments" value={formatNumber(shipments.length)} icon={<Package size={16} />} />
        <StatCard label="In transit" value={formatNumber(inTransit)} icon={<Truck size={16} />} />
        <StatCard label="Delivered" value={formatNumber(delivered)} />
        <StatCard label="Delivery rate" value={`${shipments.length ? Math.round((delivered / shipments.length) * 100) : 0}%`} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {shipments.map((s) => (
          <Card key={s.id}>
            <CardBody>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Link href={`/orders/${s.orderId}`} className="text-sm font-semibold text-merlot hover:underline">
                      {s.orderCode}
                    </Link>
                    <ShipmentBadge status={s.status} />
                  </div>
                  <p className="mt-0.5 text-sm text-foreground">{s.customerName} · {s.destinationCity}</p>
                  <p className="text-xs text-muted">
                    {s.courier} {s.service} · {s.trackingNumber} · {formatIDR(s.cost)}
                  </p>
                </div>
              </div>

              <ol className="mt-4 space-y-3 border-l border-border pl-4">
                {s.events.map((e, i) => {
                  const last = i === s.events.length - 1;
                  return (
                    <li key={i} className="relative">
                      <span
                        className={`absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full ${
                          last ? "bg-merlot" : "bg-taupe"
                        }`}
                      />
                      <div className="text-sm font-medium text-foreground">{e.status}</div>
                      <div className="text-xs text-muted">{e.note} · {formatDateTime(e.at)}</div>
                    </li>
                  );
                })}
              </ol>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}

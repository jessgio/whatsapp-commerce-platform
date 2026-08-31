import Link from "next/link";
import { Truck, Package, CheckCircle2 } from "lucide-react";
import { requirePermission } from "@/lib/guard";
import { listShipments } from "@/lib/data/repo";
import { loadShipmentBoard } from "@/lib/integrations/shipping";
import {
  isBiteshipCancelled,
  isBiteshipInTransit,
  normalizeBiteshipStatus,
} from "@/lib/biteship-status";
import { Card, CardBody, PageHeader, StatCard } from "@/components/ui";
import { BiteshipStatusBadge, ShipmentBadge } from "@/components/status";
import { formatIDR, formatDateTime, formatNumber } from "@/lib/format";

export default async function ShipmentsPage() {
  await requirePermission("shipments.view");
  const local = await listShipments();
  const { shipments, connected } = await loadShipmentBoard(local);

  const total = shipments.length;
  const inTransit = shipments.filter((s) =>
    s.biteshipStatus ? isBiteshipInTransit(s.biteshipStatus) : ["in_transit", "picked_up"].includes(s.status),
  ).length;
  const delivered = shipments.filter((s) =>
    s.biteshipStatus
      ? normalizeBiteshipStatus(s.biteshipStatus) === "delivered"
      : s.status === "delivered",
  ).length;
  const cancelled = shipments.filter((s) =>
    s.biteshipStatus ? isBiteshipCancelled(s.biteshipStatus) : false,
  ).length;
  const deliveryRate = total ? Math.round((delivered / total) * 100) : 0;

  return (
    <div>
      <PageHeader
        title="Shipments"
        subtitle={
          connected
            ? "Live tracking via Biteship - SiCepat, J&T, JNE, Anteraja"
            : "3PL tracking via Biteship - SiCepat, J&T, JNE, Anteraja"
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total shipments" value={formatNumber(total)} icon={<Package size={16} />} />
        <StatCard label="In transit" value={formatNumber(inTransit)} icon={<Truck size={16} />} />
        <StatCard label="Delivered" value={formatNumber(delivered)} icon={<CheckCircle2 size={16} />} />
        <StatCard label="Delivery rate" value={`${deliveryRate}%`} />
      </div>
      {connected && cancelled > 0 ? (
        <p className="mb-3 text-xs text-muted">
          {formatNumber(cancelled)} cancelled / rejected on Biteship. Status live from{" "}
          <a
            href="https://biteship.com/id/docs/api/orders/retrieve"
            className="text-merlot hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            Orders API
          </a>
          .
        </p>
      ) : connected ? (
        <p className="mb-3 text-xs text-muted">
          Status diambil live dari Biteship Orders API.
        </p>
      ) : (
        <p className="mb-3 text-xs text-muted">
          Set BITESHIP_API_KEY to show live courier status from Biteship.
        </p>
      )}

      {shipments.length === 0 ? (
        <div className="rounded-[16px] border border-dashed border-border bg-surface px-6 py-12 text-center">
          <p className="text-sm font-medium text-foreground">No shipments yet</p>
          <p className="mt-1 text-sm text-muted">
            {connected
              ? "Biteship is connected, but there are no booked shipments in the CRM yet. Pack an order in Warehouse to create one, or set BITESHIP_TEST_DELIVERED_ORDER_ID / BITESHIP_TEST_CANCELLED_ORDER_ID to preview a Biteship order."
              : "Packed orders booked with Biteship will show tracking here."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {shipments.map((s) => (
            <Card key={s.id}>
              <CardBody>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {s.orderId ? (
                        <Link
                          href={`/orders/${s.orderId}`}
                          className="text-sm font-semibold text-merlot hover:underline"
                        >
                          {s.orderCode}
                        </Link>
                      ) : (
                        <span className="text-sm font-semibold text-foreground">
                          {s.orderCode}
                        </span>
                      )}
                      {s.biteshipStatus ? (
                        <BiteshipStatusBadge status={s.biteshipStatus} />
                      ) : (
                        <ShipmentBadge status={s.status} />
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-foreground">
                      {s.customerName}
                      {s.destinationCity ? ` · ${s.destinationCity}` : ""}
                    </p>
                    <p className="text-xs text-muted">
                      {s.courier} {s.service}
                      {s.trackingNumber ? ` · ${s.trackingNumber}` : ""}
                      {s.cost ? ` · ${formatIDR(s.cost)}` : ""}
                    </p>
                  </div>
                  {s.biteshipLink ? (
                    <a
                      href={s.biteshipLink}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 text-xs font-medium text-merlot hover:underline"
                    >
                      Track
                    </a>
                  ) : null}
                </div>

                {s.events.length > 0 ? (
                  <ol className="mt-4 space-y-3 border-l border-border pl-4">
                    {s.events.map((e, i) => {
                      const last = i === s.events.length - 1;
                      return (
                        <li key={`${e.at}-${e.status}-${i}`} className="relative">
                          <span
                            className={`absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full ${
                              last ? "bg-merlot" : "bg-taupe"
                            }`}
                          />
                          <div className="text-sm font-medium capitalize text-foreground">
                            {e.status.replace(/_/g, " ")}
                          </div>
                          <div className="text-xs text-muted">
                            {e.note}
                            {e.at ? ` · ${formatDateTime(e.at)}` : ""}
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                ) : (
                  <p className="mt-4 text-xs text-muted">No tracking events yet.</p>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

import Link from "next/link";
import { requirePermission } from "@/lib/guard";
import {
  countFulfillmentQueue,
  countOpenNotices,
  listFulfillmentQueue,
  listNotices,
  listProducts,
} from "@/lib/data/repo";
import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  PageHeader,
  StatCard,
  Table,
  Th,
  Td,
} from "@/components/ui";
import { ScanLine } from "lucide-react";
import { OrderBadge } from "@/components/status";
import { NoticeActions } from "@/components/warehouse/notice-actions";
import { GenerateLabelButton } from "@/components/warehouse/label-actions";
import { formatNumber, timeAgo } from "@/lib/format";

const NOTICE_TONE = { open: "danger", ack: "warning", resolved: "success" } as const;
const QUEUE_ROWS = 12;

export default async function WarehousePage() {
  await requirePermission("warehouse.view");
  // Only the dozen queue rows this page renders are fetched; the headline
  // numbers are counted in Postgres so they are not bounded by a page size.
  const [products, fulfillment, queueTotal, notices, openNoticeCount] =
    await Promise.all([
      listProducts(),
      listFulfillmentQueue(QUEUE_ROWS),
      countFulfillmentQueue(),
      listNotices(),
      countOpenNotices(),
    ]);

  const lowStock = products.filter((p) => p.stock <= p.reorderPoint);

  return (
    <div>
      <PageHeader
        title="Warehouse"
        subtitle="Fulfillment queue, stock health and team notices"
        actions={
          <Link
            href="/warehouse/pack"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:bg-merlot-600"
          >
            <ScanLine size={15} /> Open Pack Station
          </Link>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Awaiting fulfillment" value={formatNumber(queueTotal)} />
        <StatCard label="SKUs to reorder" value={formatNumber(lowStock.length)} />
        <StatCard label="Open notices" value={formatNumber(openNoticeCount)} />
        <StatCard label="Total SKUs" value={formatNumber(products.length)} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Fulfillment queue</CardTitle>
            <span className="text-xs text-muted">
              {queueTotal > fulfillment.length
                ? `Oldest ${fulfillment.length} of ${formatNumber(queueTotal)}`
                : "Paid → pick → pack → ship"}
            </span>
          </CardHeader>
          <CardBody className="pt-0">
            {fulfillment.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">Nothing to fulfill.</p>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Order</Th>
                    <Th>Customer</Th>
                    <Th>Status</Th>
                    <Th>Items</Th>
                    <Th>Label & pack</Th>
                  </tr>
                </thead>
                <tbody>
                  {fulfillment.map((o) => (
                    <tr key={o.id} className="hover:bg-surface-muted">
                      <Td>
                        <Link href={`/orders/${o.id}`} className="text-sm font-medium text-merlot hover:underline">
                          {o.code}
                        </Link>
                      </Td>
                      <Td className="text-sm">{o.customerName}</Td>
                      <Td><OrderBadge status={o.status} /></Td>
                      <Td className="text-sm text-muted">{o.items.reduce((s, i) => s + i.qty, 0)} pcs</Td>
                      <Td>
                        {o.labelNumber ? (
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/warehouse/labels/${o.id}`}
                              className="rounded-md border border-border bg-surface px-2 py-1 text-xs font-medium text-foreground hover:bg-surface-muted"
                            >
                              Print label
                            </Link>
                            <Link href="/warehouse/pack" className="text-xs font-medium text-merlot hover:underline">
                              Pack →
                            </Link>
                          </div>
                        ) : (
                          <GenerateLabelButton orderId={o.id} />
                        )}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Low / out of stock</CardTitle>
          </CardHeader>
          <CardBody className="pt-0">
            <Table>
              <thead>
                <tr>
                  <Th>Product</Th>
                  <Th className="text-right">Stock</Th>
                  <Th className="text-right">Reorder pt</Th>
                </tr>
              </thead>
              <tbody>
                {lowStock.map((p) => (
                  <tr key={p.id} className="hover:bg-surface-muted">
                    <Td>
                      <div className="text-sm font-medium text-foreground">{p.name}</div>
                      <div className="font-mono text-xs text-muted">{p.sku}</div>
                    </Td>
                    <Td className="text-right text-sm font-medium text-danger">{p.stock}</Td>
                    <Td className="text-right text-sm text-muted">{p.reorderPoint}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </CardBody>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Notices from sales & CS</CardTitle>
          <span className="text-xs text-muted">{openNoticeCount} open</span>
        </CardHeader>
        <CardBody className="space-y-2 pt-0">
          {notices.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted">No notices.</p>
          ) : (
            notices.map((n) => (
              <div key={n.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Link href={`/orders/${n.orderId}`} className="text-sm font-medium text-merlot hover:underline">
                      {n.orderCode}
                    </Link>
                    <Badge tone={NOTICE_TONE[n.status]}>{n.status}</Badge>
                    <span className="text-xs text-muted">{n.type.replace("_", " ")}</span>
                  </div>
                  <p className="truncate text-sm text-foreground">{n.message}</p>
                  <p className="text-[11px] text-muted">by {n.raisedByName} · {timeAgo(n.createdAt)}</p>
                </div>
                <NoticeActions notice={n} />
              </div>
            ))
          )}
        </CardBody>
      </Card>
    </div>
  );
}

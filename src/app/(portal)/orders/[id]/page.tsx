import { notFound } from "next/navigation";
import Link from "next/link";
import { MapPin, ExternalLink, AlertTriangle } from "lucide-react";
import { requirePermission } from "@/lib/guard";
import { can } from "@/lib/rbac";
import { getOrder } from "@/lib/data/repo";
import { Card, CardBody, CardHeader, CardTitle, Table, Th, Td } from "@/components/ui";
import { OrderBadge, PaymentBadge } from "@/components/status";
import { OrderActions } from "@/components/orders/order-actions";
import { cn } from "@/lib/utils";
import { formatIDR, formatDateTime } from "@/lib/format";
import type { OrderStatus } from "@/lib/types";

const STEPS: OrderStatus[] = ["new", "paid", "allocated", "packed", "shipped", "delivered"];

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePermission("orders.view");
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) notFound();
  const canEdit = can(user.role, "orders.edit");
  const currentStep = STEPS.indexOf(order.status);

  return (
    <div className="space-y-4">
      <Link href="/orders" className="text-sm text-muted hover:text-foreground">
        ← Back to orders
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{order.code}</h1>
          <p className="mt-1 text-sm text-muted">
            {formatDateTime(order.createdAt)} · {order.channel === "whatsapp_cart" ? "WhatsApp cart" : "Agent-created"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <OrderBadge status={order.status} />
          <PaymentBadge status={order.paymentStatus} />
        </div>
      </div>

      {order.status !== "cancelled" && (
        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              {STEPS.map((s, i) => (
                <div key={s} className="flex flex-1 items-center last:flex-none">
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold",
                        i <= currentStep ? "bg-merlot text-primary-foreground" : "bg-beige-200 text-muted",
                      )}
                    >
                      {i + 1}
                    </div>
                    <span className="mt-1 text-[11px] capitalize text-muted">{s}</span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={cn("mx-1 h-0.5 flex-1", i < currentStep ? "bg-merlot" : "bg-beige-200")} />
                  )}
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {order.flaggedIssue && (
        <div className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span><strong>Flagged:</strong> {order.flaggedIssue}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Items</CardTitle></CardHeader>
          <CardBody className="pt-0">
            <Table>
              <thead>
                <tr>
                  <Th>Product</Th>
                  <Th className="text-right">Qty</Th>
                  <Th className="text-right">Unit</Th>
                  <Th className="text-right">Subtotal</Th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((it) => (
                  <tr key={it.productId}>
                    <Td>
                      <div className="text-sm font-medium text-foreground">{it.name}</div>
                      <div className="font-mono text-xs text-muted">{it.sku}</div>
                    </Td>
                    <Td className="text-right text-sm">{it.qty}</Td>
                    <Td className="text-right text-sm">{formatIDR(it.unitPrice)}</Td>
                    <Td className="text-right text-sm font-medium">{formatIDR(it.qty * it.unitPrice)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <div className="mt-4 ml-auto w-full max-w-xs space-y-1.5 text-sm">
              <Row label="Subtotal" value={formatIDR(order.subtotal)} />
              <Row label="Shipping" value={formatIDR(order.shippingCost)} />
              <div className="flex justify-between border-t border-border pt-1.5 text-base font-semibold text-foreground">
                <span>Total</span>
                <span>{formatIDR(order.total)}</span>
              </div>
            </div>
          </CardBody>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Customer</CardTitle></CardHeader>
            <CardBody className="space-y-3 pt-0 text-sm">
              <Link href={`/customers/${order.customerId}`} className="flex items-center gap-1 font-medium text-merlot hover:underline">
                {order.customerName} <ExternalLink size={12} />
              </Link>
              {order.shippingAddress && (
                <div className="rounded-lg bg-surface-muted p-3 text-xs text-muted">
                  <div className="mb-1 flex items-center gap-1 font-medium text-foreground">
                    <MapPin size={12} /> Shipping address (snapshot)
                  </div>
                  {order.shippingAddress.recipientName}
                  <br />
                  {order.shippingAddress.line1}
                  <br />
                  {order.shippingAddress.city} {order.shippingAddress.postalCode}
                </div>
              )}
              {order.courier && (
                <p className="text-xs text-muted">
                  Courier: <span className="font-medium text-foreground">{order.courier}</span>
                  {order.trackingNumber && <> · {order.trackingNumber}</>}
                </p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader><CardTitle>Payment</CardTitle></CardHeader>
            <CardBody className="space-y-3 pt-0 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted">Status</span>
                <PaymentBadge status={order.paymentStatus} />
              </div>
              {order.paymentProvider && (
                <div className="flex items-center justify-between">
                  <span className="text-muted">Provider</span>
                  <span className="font-medium capitalize text-foreground">{order.paymentProvider}</span>
                </div>
              )}
              {order.paymentLink && (
                <a
                  href={order.paymentLink}
                  target="_blank"
                  rel="noreferrer"
                  className="block truncate text-xs text-merlot hover:underline"
                >
                  {order.paymentLink}
                </a>
              )}
              <OrderActions order={order} canEdit={canEdit} />
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-muted">
      <span>{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}

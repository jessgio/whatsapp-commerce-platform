import { notFound } from "next/navigation";
import Link from "next/link";
import { MapPin, Star, MessageSquare, ShieldCheck } from "lucide-react";
import { requirePermission } from "@/lib/guard";
import { can } from "@/lib/rbac";
import { getCustomer, getCustomerAddresses, listOrdersForCustomer } from "@/lib/data/repo";
import { Avatar, Badge, Card, CardBody, CardHeader, CardTitle, Table, Th, Td } from "@/components/ui";
import { ConsentBadge, OrderBadge, PaymentBadge } from "@/components/status";
import { formatIDR, formatIDRCompact, formatDate } from "@/lib/format";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, user] = await Promise.all([params, requirePermission("customers.view")]);
  const [customer, addresses, orders] = await Promise.all([
    getCustomer(id),
    getCustomerAddresses(id),
    listOrdersForCustomer(id),
  ]);
  if (!customer) notFound();
  const canSeePii = can(user.role, "customers.pii");

  return (
    <div className="space-y-4">
      <Link href="/customers" className="text-sm text-muted hover:text-foreground">
        ← Back to customers
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar name={customer.name} color="#6f2c3f" size={56} />
          <div>
            <h1 className="text-xl font-semibold text-foreground">{customer.name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
              <span>wa_id {customer.waId}</span>
              <span>·</span>
              <span>{canSeePii ? customer.phone : "phone hidden"}</span>
              {customer.email && canSeePii && <span>· {customer.email}</span>}
              {customer.birthDate && canSeePii && (
                <span>· Lahir {formatDate(customer.birthDate)}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ConsentBadge status={customer.consentStatus} />
          {customer.segments.map((s) => (
            <Badge key={s} tone="merlot">{s}</Badge>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricBox icon={<Star size={15} />} label="Lifetime value" value={formatIDRCompact(customer.lifetimeValue)} />
        <MetricBox icon={<MessageSquare size={15} />} label="Orders" value={String(customer.orderCount)} />
        <MetricBox icon={<ShieldCheck size={15} />} label="Consent via" value={customer.consentChannel.replace("_", " ")} />
        <MetricBox icon={<MapPin size={15} />} label="City" value={customer.city ?? "—"} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Saved addresses</CardTitle>
            <span className="text-xs text-muted">{addresses.length} on file</span>
          </CardHeader>
          <CardBody className="space-y-3 pt-0">
            {addresses.map((a) => (
              <div key={a.id} className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{a.label}</span>
                  {a.isDefault && <Badge tone="success">Default</Badge>}
                </div>
                <p className="mt-1 text-xs text-muted">
                  {canSeePii ? (
                    <>
                      {a.recipientName} · {a.recipientPhone}
                      <br />
                      {a.line1}, {a.district}
                      <br />
                      {a.city}, {a.province} {a.postalCode}
                    </>
                  ) : (
                    "Address hidden — requires PII permission"
                  )}
                </p>
              </div>
            ))}
            <p className="text-[11px] text-muted">
              Reused automatically on every new order — customers never re-enter their details.
            </p>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Order history</CardTitle>
            <Link href="/orders" className="text-xs text-merlot hover:underline">All orders</Link>
          </CardHeader>
          <CardBody className="pt-0">
            {orders.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">No orders yet.</p>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Order</Th>
                    <Th>Status</Th>
                    <Th>Payment</Th>
                    <Th className="text-right">Total</Th>
                    <Th>Date</Th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id} className="hover:bg-surface-muted">
                      <Td>
                        <Link href={`/orders/${o.id}`} className="text-sm font-medium text-merlot hover:underline">
                          {o.code}
                        </Link>
                      </Td>
                      <Td><OrderBadge status={o.status} /></Td>
                      <Td><PaymentBadge status={o.paymentStatus} /></Td>
                      <Td className="text-right text-sm font-medium">{formatIDR(o.total)}</Td>
                      <Td className="text-sm text-muted">{formatDate(o.createdAt)}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function MetricBox({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardBody className="space-y-1">
        <span className="flex items-center gap-1.5 text-xs text-muted">
          <span className="text-taupe">{icon}</span> {label}
        </span>
        <span className="block text-lg font-semibold capitalize text-foreground">{value}</span>
      </CardBody>
    </Card>
  );
}

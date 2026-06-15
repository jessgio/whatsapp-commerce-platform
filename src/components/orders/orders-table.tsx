"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Table, Th, Td, Badge } from "@/components/ui";
import { OrderBadge, PaymentBadge } from "@/components/status";
import { cn } from "@/lib/utils";
import { formatIDR, formatDate } from "@/lib/format";
import type { Order, OrderStatus } from "@/lib/types";

const FILTERS: (OrderStatus | "all")[] = [
  "all",
  "new",
  "paid",
  "allocated",
  "packed",
  "shipped",
  "delivered",
  "cancelled",
];

export function OrdersTable({ orders }: { orders: Order[] }) {
  const [status, setStatus] = useState<OrderStatus | "all">("all");
  const filtered = useMemo(
    () => (status === "all" ? orders : orders.filter((o) => o.status === status)),
    [orders, status],
  );

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-1">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setStatus(f)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors",
              status === f ? "bg-merlot text-primary-foreground" : "bg-surface text-muted hover:bg-surface-muted",
            )}
          >
            {f}
          </button>
        ))}
        <span className="ml-auto self-center text-xs text-muted">{filtered.length} orders</span>
      </div>

      <Table>
        <thead>
          <tr>
            <Th>Order</Th>
            <Th>Customer</Th>
            <Th>Channel</Th>
            <Th>Status</Th>
            <Th>Payment</Th>
            <Th className="text-right">Total</Th>
            <Th>Date</Th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((o) => (
            <tr key={o.id} className="hover:bg-surface-muted">
              <Td>
                <Link href={`/orders/${o.id}`} className="text-sm font-medium text-merlot hover:underline">
                  {o.code}
                </Link>
                {o.flaggedIssue && <Badge tone="danger" className="ml-2">flagged</Badge>}
              </Td>
              <Td className="text-sm text-foreground">{o.customerName}</Td>
              <Td>
                <span className="text-xs text-muted">
                  {o.channel === "whatsapp_cart" ? "WA cart" : "Agent"}
                </span>
              </Td>
              <Td><OrderBadge status={o.status} /></Td>
              <Td><PaymentBadge status={o.paymentStatus} /></Td>
              <Td className="text-right text-sm font-medium">{formatIDR(o.total)}</Td>
              <Td className="text-sm text-muted">{formatDate(o.createdAt)}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}

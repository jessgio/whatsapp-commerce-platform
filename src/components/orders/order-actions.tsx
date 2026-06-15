"use client";

import { useState, useTransition } from "react";
import { CreditCard, ArrowRight, AlertTriangle } from "lucide-react";
import {
  advanceStatus,
  generatePaymentLink,
  raiseWarehouseNotice,
} from "@/app/(portal)/orders/actions";
import type { Order } from "@/lib/types";

export function OrderActions({ order, canEdit }: { order: Order; canEdit: boolean }) {
  const [pending, start] = useTransition();
  const [showNotice, setShowNotice] = useState(false);
  const terminal = order.status === "delivered" || order.status === "cancelled";

  if (!canEdit) return null;

  return (
    <div className="space-y-2">
      {!order.paymentLink && order.paymentStatus !== "paid" && (
        <button
          disabled={pending}
          onClick={() => start(() => generatePaymentLink(order.id))}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-merlot-600 disabled:opacity-50"
        >
          <CreditCard size={15} /> Generate payment link
        </button>
      )}

      {!terminal && (
        <button
          disabled={pending}
          onClick={() => start(() => advanceStatus(order.id))}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground hover:bg-surface-muted disabled:opacity-50"
        >
          Advance status <ArrowRight size={15} />
        </button>
      )}

      <button
        onClick={() => setShowNotice((v) => !v)}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-danger/40 bg-danger/5 px-3 py-2 text-sm font-medium text-danger hover:bg-danger/10"
      >
        <AlertTriangle size={15} /> Flag issue to warehouse
      </button>

      {showNotice && (
        <form
          action={(fd) => start(() => raiseWarehouseNotice(order.id, fd))}
          className="space-y-2 rounded-lg border border-border bg-surface-muted p-3"
        >
          <textarea
            name="message"
            required
            rows={2}
            placeholder="Describe the issue for the warehouse team…"
            className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-merlot"
          />
          <button
            disabled={pending}
            className="w-full rounded-md bg-danger px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            Send notice
          </button>
        </form>
      )}
    </div>
  );
}

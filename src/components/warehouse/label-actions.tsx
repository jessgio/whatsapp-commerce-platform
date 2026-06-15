"use client";

import { useTransition } from "react";
import { Printer, Tag } from "lucide-react";
import { generateLabel } from "@/app/(portal)/warehouse/actions";

export function GenerateLabelButton({ orderId }: { orderId: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => start(() => generateLabel(orderId))}
      className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-1 text-xs font-medium text-foreground hover:bg-surface-muted disabled:opacity-50"
    >
      <Tag size={12} /> {pending ? "Generating…" : "Generate label"}
    </button>
  );
}

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="no-print inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:bg-merlot-600"
    >
      <Printer size={15} /> Print label
    </button>
  );
}

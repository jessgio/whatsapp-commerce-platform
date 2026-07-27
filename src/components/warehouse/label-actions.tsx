"use client";

import { useState, useTransition } from "react";
import { Printer, Tag } from "lucide-react";
import { generateLabel } from "@/app/(portal)/warehouse/actions";

export function GenerateLabelButton({ orderId }: { orderId: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await generateLabel(orderId);
            setError(res.ok ? null : res.error);
          })
        }
        className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-1 text-xs font-medium text-foreground hover:bg-surface-muted disabled:opacity-50"
      >
        <Tag size={12} /> {pending ? "Generating…" : "Generate label"}
      </button>
      {error && <span className="text-[11px] text-danger">{error}</span>}
    </div>
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

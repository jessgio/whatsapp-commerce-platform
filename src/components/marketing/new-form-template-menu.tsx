"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, FileText, QrCode } from "lucide-react";
import { Button } from "@/components/ui";
import { createFormTemplateAction } from "@/app/(portal)/marketing/design/form/actions";
import { cn } from "@/lib/utils";

const OPTIONS = [
  {
    variant: "basic" as const,
    label: "Basic form",
    hint: "Same builder as the system QR lead form — fields, copy, and thank-you page.",
    icon: FileText,
  },
  {
    variant: "digital" as const,
    label: "Form Digital",
    hint: "Public share link, optional expiry, and QR with the Aeris mark.",
    icon: QrCode,
  },
];

export function NewFormTemplateMenu() {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<"basic" | "digital" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    function onPointer(e: PointerEvent) {
      if (rootRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function create(variant: "basic" | "digital") {
    if (pending) return;
    setError(null);
    setPending(variant);
    const res = await createFormTemplateAction({ variant });
    if (res.ok && res.id) {
      router.push(`/marketing/design/form/${res.id}`);
      return;
    }
    setPending(null);
    setOpen(false);
    setError(res.error ?? "Failed to create form template.");
  }

  return (
    <div ref={rootRef} className="relative">
      <Button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={Boolean(pending)}
        onClick={() => setOpen((v) => !v)}
      >
        {pending ? "Creating…" : "New form template"}
        <ChevronDown size={14} className={cn(open && "rotate-180")} />
      </Button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-1.5 w-80 overflow-hidden rounded-xl border border-border bg-surface py-1 shadow-[0_12px_40px_rgba(45,43,42,0.12)]"
        >
          {OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const busy = pending === opt.variant;
            return (
              <button
                key={opt.variant}
                type="button"
                role="menuitem"
                disabled={Boolean(pending)}
                onClick={() => void create(opt.variant)}
                className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition hover:bg-surface-muted disabled:opacity-50"
              >
                <Icon
                  size={16}
                  className="mt-0.5 shrink-0 text-merlot"
                />
                <span>
                  <span className="block text-sm font-medium text-foreground">
                    {busy ? "Creating…" : opt.label}
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-muted">
                    {opt.hint}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
      {error ? (
        <p className="absolute right-0 mt-1 max-w-80 text-right text-[11px] text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

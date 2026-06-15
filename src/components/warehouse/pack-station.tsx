"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ScanLine, CheckCircle2, Clock, AlertTriangle, Package, RotateCcw } from "lucide-react";
import {
  completePackSession,
  scanItem,
  startPackSession,
  type PackResult,
} from "@/app/(portal)/warehouse/pack/actions";
import { cn } from "@/lib/utils";
import type { PackSession } from "@/lib/types";

interface PackableHint {
  code: string;
  label: string;
  customer: string;
  units: number;
}

export function PackStation({ packable }: { packable: PackableHint[] }) {
  const [session, setSession] = useState<PackSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [session?.id, session?.status]);

  function handle(result: PackResult, onOk?: () => void) {
    if (result.ok) {
      setSession(result.session);
      setError(null);
      onOk?.();
    } else {
      setError(result.error);
    }
    inputRef.current?.focus();
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const input = inputRef.current;
    if (!input) return;
    const value = input.value;
    input.value = "";
    if (!value.trim()) return;

    if (!session || session.status === "completed") {
      start(async () => handle(await startPackSession(value)));
    } else {
      start(async () =>
        handle(await scanItem(session.id, value), () => {
          setFlash(value);
          setTimeout(() => setFlash(null), 350);
        }),
      );
    }
  }

  function reset() {
    setSession(null);
    setError(null);
    inputRef.current?.focus();
  }

  const allScanned = session?.items.every((i) => i.scanned >= i.required) ?? false;
  const currentIdx = session?.items.findIndex((i) => i.scanned < i.required) ?? -1;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-4">
        {/* Scanner input — always present, acts as the barcode wedge target */}
        <form onSubmit={onSubmit} className="rounded-[14px] border border-border bg-surface p-4">
          <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-foreground">
            <ScanLine size={16} className="text-merlot" />
            {!session || session.status === "completed"
              ? "Scan shipping label (AWB)"
              : `Scan product barcode${currentIdx >= 0 ? ` · ${session.items[currentIdx].name}` : ""}`}
          </label>
          <div className="flex gap-2">
            <input
              ref={inputRef}
              autoFocus
              autoComplete="off"
              placeholder={!session || session.status === "completed" ? "Scan or type label number…" : "Scan or type product barcode…"}
              className="w-full rounded-lg border border-border bg-surface-muted px-3 py-3 text-base outline-none focus:border-merlot"
            />
            <button
              type="submit"
              disabled={pending}
              className="shrink-0 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-merlot-600 disabled:opacity-50"
            >
              {!session || session.status === "completed" ? "Open" : "Scan"}
            </button>
          </div>
          {error && (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-danger">
              <AlertTriangle size={14} /> {error}
            </p>
          )}
        </form>

        {!session && (
          <div className="rounded-[14px] border border-border bg-surface p-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
              Ready to pack ({packable.length})
            </p>
            {packable.length === 0 ? (
              <p className="text-sm text-muted">No labelled orders waiting. Generate labels in the warehouse queue.</p>
            ) : (
              <ul className="divide-y divide-border/60">
                {packable.map((p) => (
                  <li key={p.code} className="flex items-center justify-between py-2 text-sm">
                    <span>
                      <span className="font-medium text-foreground">{p.code}</span>
                      <span className="text-muted"> · {p.customer}</span>
                    </span>
                    <button
                      onClick={() => start(async () => handle(await startPackSession(p.label)))}
                      className="rounded-md border border-border bg-surface px-2 py-1 font-mono text-xs text-merlot hover:bg-surface-muted"
                    >
                      {p.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {session && (
          <div className="rounded-[14px] border border-border bg-surface p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Package size={16} /> {session.orderCode}
                  <span className="font-mono text-xs text-muted">{session.labelNumber}</span>
                </div>
                <div className="text-xs text-muted">Packer: {session.packerName}</div>
              </div>
              <ElapsedTimer startedAt={session.startedAt} completedAt={session.completedAt} />
            </div>

            <div className="space-y-2">
              {session.items.map((it, idx) => {
                const done = it.scanned >= it.required;
                const isCurrent = idx === currentIdx;
                return (
                  <div
                    key={it.productId}
                    className={cn(
                      "rounded-lg border p-3 transition-colors",
                      done
                        ? "border-success/40 bg-success/5"
                        : isCurrent
                          ? "border-merlot bg-merlot/5"
                          : "border-border opacity-70",
                      flash && (it.barcode === flash || it.sku === flash) ? "ring-2 ring-merlot" : "",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {done ? (
                          <CheckCircle2 size={16} className="text-success" />
                        ) : (
                          <span className={cn("h-4 w-4 rounded-full border", isCurrent ? "border-merlot" : "border-border")} />
                        )}
                        <span className="text-sm font-medium text-foreground">{it.name}</span>
                      </div>
                      <span className={cn("text-sm font-semibold", done ? "text-success" : "text-foreground")}>
                        {it.scanned}/{it.required}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="font-mono text-[11px] text-muted">{it.barcode}</span>
                      <div className="h-1.5 w-40 overflow-hidden rounded-full bg-beige-200">
                        <div
                          className={cn("h-full rounded-full", done ? "bg-success" : "bg-merlot")}
                          style={{ width: `${(it.scanned / it.required) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {session.status === "completed" ? (
              <div className="mt-4 flex items-center justify-between rounded-lg bg-success/10 px-4 py-3">
                <span className="flex items-center gap-2 text-sm font-medium text-success">
                  <CheckCircle2 size={16} /> Packed & logged. Order marked ready to ship.
                </span>
                <button
                  onClick={reset}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-merlot-600"
                >
                  <RotateCcw size={14} /> Pack another
                </button>
              </div>
            ) : (
              <button
                disabled={!allScanned || pending}
                onClick={() => start(async () => handle(await completePackSession(session.id)))}
                className="mt-4 w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-merlot-600 disabled:opacity-50"
              >
                {allScanned ? "Complete pack & mark ready to ship" : "Scan all items to complete"}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Live scan log */}
      <div className="rounded-[14px] border border-border bg-surface p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
          <Clock size={15} /> Scan log
        </div>
        {!session || session.scans.length === 0 ? (
          <p className="text-xs text-muted">Each scan is timestamped and attributed here.</p>
        ) : (
          <ul className="space-y-1.5">
            {[...session.scans].reverse().map((s, i) => (
              <li key={i} className="flex items-center justify-between text-xs">
                <span className="truncate text-foreground">{s.name}</span>
                <span className="shrink-0 font-mono text-muted">
                  {new Date(s.at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </span>
              </li>
            ))}
          </ul>
        )}
        <Link href="/warehouse/pack/report" className="mt-4 block text-xs text-merlot hover:underline">
          View full pack report →
        </Link>
      </div>
    </div>
  );
}

function ElapsedTimer({ startedAt, completedAt }: { startedAt: string; completedAt: string | null }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (completedAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [completedAt]);
  const end = completedAt ? new Date(completedAt).getTime() : now;
  const secs = Math.max(0, Math.floor((end - new Date(startedAt).getTime()) / 1000));
  const mm = String(Math.floor(secs / 60)).padStart(2, "0");
  const ss = String(secs % 60).padStart(2, "0");
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-2.5 py-1 font-mono text-sm text-foreground">
      <Clock size={13} /> {mm}:{ss}
    </span>
  );
}

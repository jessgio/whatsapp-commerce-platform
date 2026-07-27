"use client";

import { useState, useTransition } from "react";
import { setNoticeStatus } from "@/app/(portal)/warehouse/actions";
import type { WarehouseNotice } from "@/lib/types";

export function NoticeActions({ notice }: { notice: WarehouseNotice }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  if (notice.status === "resolved") return null;

  const update = (status: WarehouseNotice["status"]) =>
    start(async () => {
      const res = await setNoticeStatus(notice.id, status);
      setError(res.ok ? null : res.error);
    });

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-1.5">
        {notice.status === "open" && (
          <button
            disabled={pending}
            onClick={() => update("ack")}
            className="rounded-md border border-border bg-surface px-2 py-1 text-xs font-medium text-foreground hover:bg-surface-muted"
          >
            Acknowledge
          </button>
        )}
        <button
          disabled={pending}
          onClick={() => update("resolved")}
          className="rounded-md bg-success px-2 py-1 text-xs font-medium text-white hover:opacity-90"
        >
          Resolve
        </button>
      </div>
      {error && <span className="text-[11px] text-danger">{error}</span>}
    </div>
  );
}

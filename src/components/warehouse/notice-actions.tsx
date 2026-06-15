"use client";

import { useTransition } from "react";
import { setNoticeStatus } from "@/app/(portal)/warehouse/actions";
import type { WarehouseNotice } from "@/lib/types";

export function NoticeActions({ notice }: { notice: WarehouseNotice }) {
  const [pending, start] = useTransition();
  if (notice.status === "resolved") return null;
  return (
    <div className="flex gap-1.5">
      {notice.status === "open" && (
        <button
          disabled={pending}
          onClick={() => start(() => setNoticeStatus(notice.id, "ack"))}
          className="rounded-md border border-border bg-surface px-2 py-1 text-xs font-medium text-foreground hover:bg-surface-muted"
        >
          Acknowledge
        </button>
      )}
      <button
        disabled={pending}
        onClick={() => start(() => setNoticeStatus(notice.id, "resolved"))}
        className="rounded-md bg-success px-2 py-1 text-xs font-medium text-white hover:opacity-90"
      >
        Resolve
      </button>
    </div>
  );
}

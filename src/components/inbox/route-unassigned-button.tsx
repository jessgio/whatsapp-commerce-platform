"use client";

import { useState, useTransition } from "react";
import { routeUnassignedAction } from "@/app/(portal)/inbox/actions";

export function RouteUnassignedButton({ count }: { count: number }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  if (count <= 0) return null;

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setMessage(null);
            const result = await routeUnassignedAction();
            if (!result.ok) {
              setMessage(result.error ?? "Routing failed.");
              return;
            }
            setMessage(`Routed ${result.routed ?? 0}`);
          })
        }
        className="rounded-md px-2 py-1 text-[11px] font-medium text-merlot hover:bg-merlot/10 disabled:opacity-50"
      >
        {pending ? "Routing…" : `Route ${count}`}
      </button>
      {message && <span className="text-[10px] text-muted">{message}</span>}
    </div>
  );
}

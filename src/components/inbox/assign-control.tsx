"use client";

import { useState, useTransition } from "react";
import {
  assignConversation,
  claimConversationAction,
} from "@/app/(portal)/inbox/actions";
import { Select } from "@/components/select";
import type { AppUser } from "@/lib/types";

export function AssignControl({
  conversationId,
  assigneeId,
  currentUserId,
  agents,
}: {
  conversationId: string;
  assigneeId: string | null;
  currentUserId: string;
  agents: Pick<AppUser, "id" | "name" | "role">[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState(assigneeId ?? "");
  const incoming = `${conversationId}:${assigneeId ?? ""}`;
  const [synced, setSynced] = useState(incoming);
  if (incoming !== synced) {
    setSynced(incoming);
    setSelected(assigneeId ?? "");
  }
  const mine = selected === currentUserId;

  function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    startTransition(async () => {
      setError(null);
      const result = await action();
      if (!result.ok) setError(result.error ?? "Could not update assignment.");
    });
  }

  return (
    <div className="flex flex-col items-stretch gap-1 sm:items-end">
      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor={`assignee-${conversationId}`}>
          Assigned to
        </label>
        <Select
          id={`assignee-${conversationId}`}
          name="assigneeId"
          disabled={pending}
          size="sm"
          className="min-w-[9.5rem]"
          value={selected}
          onChange={(next) => {
            setSelected(next);
            const fd = new FormData();
            fd.set("assigneeId", next);
            run(() => assignConversation(conversationId, fd));
          }}
          options={[
            { value: "", label: "Unassigned" },
            ...agents.map((agent) => ({
              value: agent.id,
              label:
                agent.id === currentUserId
                  ? `${agent.name} (you)`
                  : agent.name,
            })),
          ]}
        />
        {!mine && (
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setSelected(currentUserId);
              run(() => claimConversationAction(conversationId));
            }}
            className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-surface-muted disabled:opacity-50"
          >
            {pending ? "Saving…" : "Claim"}
          </button>
        )}
      </div>
      {error && (
        <p className="text-[11px] text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { RouteUnassignedButton } from "@/components/inbox/route-unassigned-button";
import { Avatar } from "@/components/ui";
import { cn, initials } from "@/lib/utils";
import { timeAgo, windowMinutesLeft } from "@/lib/format";
import type { Conversation } from "@/lib/types";

type Filter = "all" | "open" | "mine" | "unassigned";

export function ConversationList({
  conversations,
  total,
  currentUserId,
  canAssign,
}: {
  conversations: Conversation[];
  /** Every conversation on record; the list holds the most recent page. */
  total: number;
  currentUserId: string;
  canAssign: boolean;
}) {
  const pathname = usePathname();
  const [filter, setFilter] = useState<Filter>("all");
  const conversationSelected = pathname.startsWith("/inbox/") && pathname !== "/inbox";

  const unassignedOpen = conversations.filter(
    (c) => !c.assigneeId && c.status !== "resolved",
  ).length;

  const filtered = conversations.filter((c) => {
    if (filter === "open") return c.status !== "resolved";
    if (filter === "mine") return c.assigneeId === currentUserId;
    if (filter === "unassigned") return !c.assigneeId;
    return true;
  });

  const tabs: Filter[] = ["all", "open", "mine", "unassigned"];

  return (
    <div
      className={cn(
        "flex h-full min-h-0 w-full flex-col overflow-hidden border-r border-border bg-surface md:flex md:w-80",
        conversationSelected ? "hidden" : "flex",
      )}
    >
      <div className="flex shrink-0 items-center gap-1 border-b border-border p-2">
        <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto">
          {tabs.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "shrink-0 rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors",
                filter === f ? "bg-merlot text-primary-foreground" : "text-muted hover:bg-surface-muted",
              )}
            >
              {f}
              {f === "unassigned" && unassignedOpen > 0 ? ` ${unassignedOpen}` : ""}
            </button>
          ))}
        </div>
        {canAssign && <RouteUnassignedButton count={unassignedOpen} />}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {filtered.length === 0 && (
          <p className="px-3 py-6 text-center text-xs text-muted">
            No conversations in this view.
          </p>
        )}
        {filtered.map((c) => {
          const active = pathname === `/inbox/${c.id}`;
          const mins = windowMinutesLeft(c.lastInboundAt);
          return (
            <Link
              key={c.id}
              href={`/inbox/${c.id}`}
              prefetch
              className={cn(
                "flex gap-3 border-b border-border/60 px-3 py-3 transition-colors",
                active ? "bg-surface-muted" : "hover:bg-surface-muted/60",
              )}
            >
              <Avatar name={c.customerName} color="#8a3a4f" size={38} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-foreground">{c.customerName}</span>
                  <span className="shrink-0 text-[11px] text-muted">{timeAgo(c.lastMessageAt)}</span>
                </div>
                <p className="truncate text-xs text-muted">{c.lastMessagePreview}</p>
                <div className="mt-1 flex items-center gap-1.5">
                  {c.unread > 0 && (
                    <span className="rounded-full bg-merlot px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                      {c.unread}
                    </span>
                  )}
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                      mins > 0 ? "bg-success/12 text-success" : "bg-danger/12 text-danger",
                    )}
                  >
                    {mins > 0 ? `${Math.floor(mins / 60)}h window` : "Window closed"}
                  </span>
                  {c.assigneeName ? (
                    <span className="text-[10px] text-taupe">
                      {c.assigneeId === currentUserId ? "You" : initials(c.assigneeName)}
                    </span>
                  ) : (
                    <span className="text-[10px] text-warning">Unassigned</span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
        {total > conversations.length && (
          <p className="px-3 py-4 text-center text-[11px] text-muted">
            Showing the {conversations.length} most recent of {total}{" "}
            conversations.
          </p>
        )}
      </div>
    </div>
  );
}

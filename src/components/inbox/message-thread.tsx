"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/format";
import type { Message } from "@/lib/types";

export function MessageThread({ messages }: { messages: Message[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const prevCountRef = useRef(0);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const onScroll = () => {
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      stickToBottomRef.current = distanceFromBottom < 80;
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const grew = messages.length > prevCountRef.current;
    prevCountRef.current = messages.length;

    if (grew || stickToBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  return (
    <div ref={scrollerRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-background px-4 py-5">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={cn("flex", msg.direction === "out" ? "justify-end" : "justify-start")}
        >
          <div
            className={cn(
              "max-w-[72%] rounded-2xl px-3.5 py-2 text-sm shadow-[0_1px_1px_rgba(45,43,42,0.05)]",
              msg.kind === "order"
                ? "border border-merlot/30 bg-merlot/5 text-foreground"
                : msg.direction === "out"
                  ? "bg-merlot text-primary-foreground"
                  : "bg-surface text-foreground",
            )}
          >
            {msg.kind === "order" && (
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-merlot">
                Order created
              </div>
            )}
            <p className="whitespace-pre-wrap">{msg.body}</p>
            <div
              className={cn(
                "mt-1 text-[10px]",
                msg.direction === "out" && msg.kind !== "order"
                  ? "text-primary-foreground/70"
                  : "text-muted",
              )}
            >
              {msg.authorName ? `${msg.authorName} · ` : ""}
              {formatDateTime(msg.createdAt)}
              {msg.status ? ` · ${msg.status}` : ""}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

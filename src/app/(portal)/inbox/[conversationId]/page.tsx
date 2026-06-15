import { notFound } from "next/navigation";
import Link from "next/link";
import { Phone, ExternalLink } from "lucide-react";
import { getConversation, listMessages } from "@/lib/data/repo";
import { Avatar, Badge } from "@/components/ui";
import { ConvStatusBadge } from "@/components/status";
import { Composer } from "@/components/inbox/composer";
import { cn } from "@/lib/utils";
import { formatDateTime, windowMinutesLeft } from "@/lib/format";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  const conv = await getConversation(conversationId);
  if (!conv) notFound();
  const messages = await listMessages(conversationId);
  const mins = windowMinutesLeft(conv.lastInboundAt);
  const windowOpen = mins > 0;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-3">
        <div className="flex items-center gap-3">
          <Avatar name={conv.customerName} color="#8a3a4f" size={38} />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">{conv.customerName}</span>
              <ConvStatusBadge status={conv.status} />
            </div>
            <div className="flex items-center gap-1 text-xs text-muted">
              <Phone size={11} /> +{conv.customerWaId}
              {conv.topic && <span>· {conv.topic}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={windowOpen ? "success" : "danger"}>
            {windowOpen ? `${Math.floor(mins / 60)}h ${mins % 60}m left` : "24h window closed"}
          </Badge>
          <Link
            href={`/customers/${conv.customerId}`}
            className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-surface-muted"
          >
            Profile <ExternalLink size={12} />
          </Link>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto bg-background px-4 py-5">
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

      <Composer conversationId={conv.id} windowOpen={windowOpen} />
    </div>
  );
}

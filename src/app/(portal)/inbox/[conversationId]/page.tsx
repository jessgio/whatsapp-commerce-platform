import { notFound } from "next/navigation";
import Link from "next/link";
import { Phone, ExternalLink } from "lucide-react";
import { getConversation, listMessages } from "@/lib/data/repo";
import { Avatar, Badge } from "@/components/ui";
import { ConvStatusBadge } from "@/components/status";
import { Composer } from "@/components/inbox/composer";
import { MessageThread } from "@/components/inbox/message-thread";
import { windowMinutesLeft } from "@/lib/format";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  const [conv, messages] = await Promise.all([
    getConversation(conversationId),
    listMessages(conversationId),
  ]);
  if (!conv) notFound();
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

      <MessageThread messages={messages} />

      <Composer conversationId={conv.id} windowOpen={windowOpen} />
    </div>
  );
}

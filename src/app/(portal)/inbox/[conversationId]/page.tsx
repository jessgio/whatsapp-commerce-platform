import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Phone, ExternalLink } from "lucide-react";
import { getConversation, listMessages, listStaffUsers } from "@/lib/data/repo";
import { AssignControl } from "@/components/inbox/assign-control";
import { Avatar, Badge } from "@/components/ui";
import { ConvStatusBadge } from "@/components/status";
import { Composer } from "@/components/inbox/composer";
import { MessageThread } from "@/components/inbox/message-thread";
import { assignableAgents } from "@/lib/cs-routing";
import { windowMinutesLeft } from "@/lib/format";
import { requirePermission } from "@/lib/guard";
import { can } from "@/lib/rbac";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const [{ conversationId }, user] = await Promise.all([
    params,
    requirePermission("inbox.view"),
  ]);
  const [conv, messages, staff] = await Promise.all([
    getConversation(conversationId),
    listMessages(conversationId),
    listStaffUsers(),
  ]);
  if (!conv) notFound();
  const mins = windowMinutesLeft(conv.lastInboundAt);
  const windowOpen = mins > 0;
  const agents = assignableAgents(staff);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border bg-surface px-3 py-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Link
            href="/inbox"
            className="inline-flex shrink-0 items-center justify-center rounded-lg p-1.5 text-muted hover:bg-surface-muted hover:text-foreground md:hidden"
            aria-label="Back to conversations"
          >
            <ArrowLeft size={18} />
          </Link>
          <Avatar name={conv.customerName} color="#8a3a4f" size={38} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate text-sm font-semibold text-foreground">{conv.customerName}</span>
              <ConvStatusBadge status={conv.status} />
            </div>
            <div className="flex items-center gap-1 text-xs text-muted">
              <Phone size={11} className="shrink-0" />
              <span className="truncate">+{conv.customerWaId}</span>
              {conv.topic && <span className="truncate">· {conv.topic}</span>}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 pl-9 md:pl-0">
          <Badge tone={windowOpen ? "success" : "danger"}>
            {windowOpen ? `${Math.floor(mins / 60)}h ${mins % 60}m left` : "24h window closed"}
          </Badge>
          {can(user.role, "inbox.reply") && (
            <AssignControl
              conversationId={conv.id}
              assigneeId={conv.assigneeId}
              currentUserId={user.id}
              agents={agents}
            />
          )}
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

import { requirePermission } from "@/lib/guard";
import { listConversations } from "@/lib/data/repo";
import { ConversationList } from "@/components/inbox/conversation-list";
import { InboxAutoRefresh } from "@/components/inbox/inbox-auto-refresh";

export default async function InboxLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePermission("inbox.view");
  const conversations = await listConversations();

  return (
    <div className="-m-5 flex h-[calc(100vh-3.5rem)] md:-m-8">
      <InboxAutoRefresh />
      <ConversationList conversations={conversations} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

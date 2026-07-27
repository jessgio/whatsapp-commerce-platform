import { requirePermission } from "@/lib/guard";
import { countConversations, listConversations } from "@/lib/data/repo";
import { ConversationList } from "@/components/inbox/conversation-list";
import { InboxAutoRefresh } from "@/components/inbox/inbox-auto-refresh";
import { InboxPane } from "@/components/inbox/inbox-pane";

export default async function InboxLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePermission("inbox.view");
  const [conversations, total] = await Promise.all([
    listConversations(),
    countConversations(),
  ]);

  return (
    <div className="-mx-5 -mb-6 flex h-[calc(100dvh-3.5rem)] md:-mx-8 md:-mb-8">
      <InboxAutoRefresh />
      <ConversationList conversations={conversations} total={total} />
      <InboxPane>{children}</InboxPane>
    </div>
  );
}

import { requirePermission } from "@/lib/guard";
import { countConversations, listConversations } from "@/lib/data/repo";
import { ConversationList } from "@/components/inbox/conversation-list";
import { InboxAutoRefresh } from "@/components/inbox/inbox-auto-refresh";
import { InboxPane } from "@/components/inbox/inbox-pane";
import { can } from "@/lib/rbac";

export default async function InboxLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requirePermission("inbox.view");
  const [conversations, total] = await Promise.all([
    listConversations(),
    countConversations(),
  ]);

  return (
    <div className="-mx-4 -my-5 flex h-[calc(100dvh-3.5rem)] min-h-0 overflow-hidden sm:-mx-5 sm:-my-6 md:-mx-8">
      <InboxAutoRefresh />
      <ConversationList
        conversations={conversations}
        total={total}
        currentUserId={user.id}
        canAssign={can(user.role, "inbox.reply")}
      />
      <InboxPane>{children}</InboxPane>
    </div>
  );
}

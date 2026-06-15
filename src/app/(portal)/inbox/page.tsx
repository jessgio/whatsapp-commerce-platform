import { MessagesSquare } from "lucide-react";

export default function InboxIndex() {
  return (
    <div className="hidden h-full flex-col items-center justify-center text-center md:flex">
      <MessagesSquare size={40} className="text-taupe" />
      <p className="mt-3 text-sm font-medium text-foreground">Select a conversation</p>
      <p className="text-xs text-muted">Pick a chat from the list to view the thread and reply.</p>
    </div>
  );
}

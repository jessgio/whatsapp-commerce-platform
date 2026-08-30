"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/** On phones, hide the thread pane until a conversation is selected. */
export function InboxPane({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const conversationSelected = pathname.startsWith("/inbox/") && pathname !== "/inbox";

  return (
    <div
      className={cn(
        "min-h-0 min-w-0 flex-1 overflow-hidden",
        conversationSelected ? "flex flex-col" : "hidden md:flex md:flex-col",
      )}
    >
      {children}
    </div>
  );
}

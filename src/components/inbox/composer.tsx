"use client";

import { useRef, useTransition } from "react";
import { Send } from "lucide-react";
import { sendReply } from "@/app/(portal)/inbox/actions";

export function Composer({
  conversationId,
  windowOpen,
}: {
  conversationId: string;
  windowOpen: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={(fd) =>
        startTransition(async () => {
          await sendReply(conversationId, fd);
          formRef.current?.reset();
        })
      }
      className="flex items-center gap-2 border-t border-border bg-surface p-3"
    >
      <input
        name="body"
        autoComplete="off"
        placeholder={windowOpen ? "Type a reply…" : "Window closed — a template is required"}
        className="flex-1 rounded-lg border border-border bg-surface-muted px-3 py-2.5 text-sm outline-none focus:border-merlot"
      />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-merlot-600 disabled:opacity-50"
      >
        <Send size={15} /> {pending ? "Sending…" : "Send"}
      </button>
    </form>
  );
}

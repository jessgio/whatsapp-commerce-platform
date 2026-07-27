"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteEmailTemplateAction } from "@/app/(portal)/marketing/design/email/actions";
import { Button } from "@/components/ui";

export function DeleteEmailTemplateButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="danger"
      disabled={pending}
      onClick={() => {
        if (!confirm("Delete this email template? Campaigns that already copied it keep their design.")) {
          return;
        }
        startTransition(async () => {
          const res = await deleteEmailTemplateAction(id);
          if (res.ok) router.push("/marketing/design/email");
        });
      }}
    >
      {pending ? "Deleting…" : "Delete"}
    </Button>
  );
}

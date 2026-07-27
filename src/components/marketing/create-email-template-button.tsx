"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { createEmailTemplateAction } from "@/app/(portal)/marketing/design/email/actions";
import { Button } from "@/components/ui";

export function CreateEmailTemplateButton({
  label = "New template",
}: {
  label?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const res = await createEmailTemplateAction();
          if (res.ok && res.id) {
            router.push(`/marketing/design/email/${res.id}`);
          }
        });
      }}
    >
      <Plus size={15} />
      {pending ? "Creating…" : label}
    </Button>
  );
}

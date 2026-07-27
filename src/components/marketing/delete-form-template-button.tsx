"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui";
import { deleteFormTemplateAction } from "@/app/(portal)/marketing/design/form/actions";

export function DeleteFormTemplateButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <Button
      type="button"
      variant="danger"
      disabled={pending}
      onClick={async () => {
        if (!confirm("Delete this form template?")) return;
        setPending(true);
        const res = await deleteFormTemplateAction(id);
        setPending(false);
        if (res.ok) {
          router.push("/marketing/design/form");
          router.refresh();
        } else {
          alert(res.error ?? "Delete failed");
        }
      }}
    >
      {pending ? "Deleting…" : "Delete"}
    </Button>
  );
}

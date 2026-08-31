"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui";
import { deleteCampaignAction } from "@/app/(portal)/marketing/campaigns/actions";
import type { CampaignStatus } from "@/lib/campaigns";

export function DeleteCampaignButton({
  id,
  name,
  status,
  afterDelete = "refresh",
}: {
  id: string;
  name: string;
  status: CampaignStatus;
  afterDelete?: "refresh" | "list";
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const sending = status === "sending";

  return (
    <Button
      type="button"
      variant="danger"
      className="h-8 px-2.5 text-xs"
      disabled={pending || sending}
      title={sending ? "Wait until this send finishes." : undefined}
      onClick={async () => {
        if (!confirm(`Delete “${name}”? This cannot be undone.`)) return;
        setPending(true);
        const res = await deleteCampaignAction(id);
        setPending(false);
        if (!res.ok) {
          alert(res.error ?? "Delete failed");
          return;
        }
        if (afterDelete === "list") {
          router.push("/marketing/campaigns");
          router.refresh();
          return;
        }
        router.refresh();
      }}
    >
      {pending ? "Deleting…" : "Delete"}
    </Button>
  );
}

export function CampaignRowActions({
  id,
  name,
  status,
}: {
  id: string;
  name: string;
  status: CampaignStatus;
}) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Link href={`/marketing/campaigns/${id}`}>
        <Button variant="secondary" className="h-8 px-2.5 text-xs">
          Edit
        </Button>
      </Link>
      <DeleteCampaignButton id={id} name={name} status={status} />
    </div>
  );
}

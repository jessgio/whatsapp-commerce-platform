"use client";

import { useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { pushCatalogNow } from "@/app/(portal)/catalog/actions";

export function PushCatalogButton() {
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => startTransition(() => pushCatalogNow())}
      className="inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:bg-merlot-600 disabled:opacity-50"
    >
      <RefreshCw size={15} className={pending ? "animate-spin" : ""} />
      {pending ? "Pushing…" : "Push to WhatsApp catalog"}
    </button>
  );
}

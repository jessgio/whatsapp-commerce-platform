"use client";

import { useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { deleteFormTemplateAction } from "@/app/(portal)/marketing/design/form/actions";

export function DeleteFormTemplateButton({
  id,
  name,
  compact = false,
}: {
  id: string;
  name?: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="danger"
        className={compact ? "h-8 px-2.5 text-xs" : undefined}
        onClick={() => setOpen(true)}
      >
        Delete
      </Button>
      {open ? (
        <DeleteFormTemplateModal
          id={id}
          name={name}
          compact={compact}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

function ModalShell({
  title,
  children,
  onClose,
  busy,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  busy?: boolean;
}) {
  const dialog = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/50 p-4 text-left"
      role="dialog"
      aria-labelledby="delete-form-template-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-[14px] border border-border bg-surface p-5 text-left shadow-[0_18px_50px_rgba(45,43,42,0.12)]">
        <h2
          id="delete-form-template-title"
          className="text-left text-base font-semibold text-foreground"
        >
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
  if (typeof document === "undefined") return dialog;
  return createPortal(dialog, document.body);
}

function DeleteFormTemplateModal({
  id,
  name,
  compact,
  onClose,
}: {
  id: string;
  name?: string;
  compact: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const label = name?.trim() || "this form template";

  async function onConfirm() {
    setBusy(true);
    setError(null);
    const res = await deleteFormTemplateAction(id);
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? "Could not delete this form template.");
      return;
    }
    onClose();
    if (!compact) router.push("/marketing/design/form");
    router.refresh();
  }

  return (
    <ModalShell title={`Delete ${label}?`} onClose={onClose} busy={busy}>
      <p className="mt-2 text-sm text-muted">
        This cannot be undone. The template will be removed from the library.
      </p>
      {error ? (
        <p className="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" type="button" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button type="button" variant="danger" disabled={busy} onClick={() => void onConfirm()}>
          {busy ? "Deleting…" : "Delete"}
        </Button>
      </div>
    </ModalShell>
  );
}

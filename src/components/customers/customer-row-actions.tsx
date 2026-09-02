"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { DatePicker } from "@/components/date-picker";
import {
  deleteCustomerAction,
  updateCustomerAction,
} from "@/app/(portal)/customers/actions";
import type { Customer } from "@/lib/types";

const inputClass =
  "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-merlot";

export function CustomerRowActions({
  customer,
  afterDelete = "refresh",
}: {
  customer: Customer;
  afterDelete?: "refresh" | "list";
}) {
  const [mode, setMode] = useState<"edit" | "delete" | null>(null);

  return (
    <>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          type="button"
          variant="secondary"
          className="h-8 px-2.5 text-xs"
          onClick={() => setMode("edit")}
        >
          Edit
        </Button>
        <Button
          type="button"
          variant="danger"
          className="h-8 px-2.5 text-xs"
          onClick={() => setMode("delete")}
        >
          Delete
        </Button>
      </div>
      {mode === "edit" ? (
        <EditCustomerModal customer={customer} onClose={() => setMode(null)} />
      ) : null}
      {mode === "delete" ? (
        <DeleteCustomerModal
          customer={customer}
          afterDelete={afterDelete}
          onClose={() => setMode(null)}
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
      aria-labelledby="customer-action-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-[14px] border border-border bg-surface p-5 text-left shadow-[0_18px_50px_rgba(45,43,42,0.12)]">
        <h2
          id="customer-action-title"
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

function FeedbackBody({
  ok,
  message,
  onOk,
}: {
  ok: boolean;
  message: string;
  onOk: () => void;
}) {
  return (
    <div className="mt-3 space-y-4 text-left">
      <p className={ok ? "text-sm text-foreground" : "text-sm text-danger"}>{message}</p>
      <div className="flex justify-end">
        <Button type="button" variant={ok ? "primary" : "secondary"} onClick={onOk}>
          OK
        </Button>
      </div>
    </div>
  );
}

function EditCustomerModal({
  customer,
  onClose,
}: {
  customer: Customer;
  onClose: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [birthDate, setBirthDate] = useState(customer.birthDate ?? "");
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const result = await updateCustomerAction(new FormData(e.currentTarget));
    setBusy(false);
    if (!result.ok) {
      setFeedback({ ok: false, message: result.error ?? "Could not update this contact." });
      return;
    }
    setFeedback({ ok: true, message: `Updated ${customer.name}.` });
  }

  if (feedback) {
    return (
      <ModalShell title={feedback.ok ? "Contact updated" : "Update failed"} onClose={onClose}>
        <FeedbackBody
          ok={feedback.ok}
          message={feedback.message}
          onOk={() => {
            if (feedback.ok) {
              onClose();
              router.refresh();
              return;
            }
            setFeedback(null);
          }}
        />
      </ModalShell>
    );
  }

  return (
    <ModalShell title={`Edit ${customer.name}`} onClose={onClose} busy={busy}>
      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <input type="hidden" name="id" value={customer.id} />
        <label className="block text-left">
          <span className="mb-1.5 block text-left text-xs font-medium text-muted">Name</span>
          <input name="name" required defaultValue={customer.name} className={`${inputClass} text-left`} />
        </label>
        <label className="block text-left">
          <span className="mb-1.5 block text-left text-xs font-medium text-muted">WhatsApp / phone</span>
          <input name="phone" required defaultValue={customer.phone} className={`${inputClass} text-left`} />
        </label>
        <label className="block text-left">
          <span className="mb-1.5 block text-left text-xs font-medium text-muted">Email</span>
          <input name="email" type="email" defaultValue={customer.email ?? ""} className={`${inputClass} text-left`} />
        </label>
        <label className="block text-left">
          <span className="mb-1.5 block text-left text-xs font-medium text-muted">City</span>
          <input name="city" defaultValue={customer.city ?? ""} className={`${inputClass} text-left`} />
        </label>
        <div className="block text-left">
          <span className="mb-1.5 block text-left text-xs font-medium text-muted">Birth date</span>
          <DatePicker
            name="birthDate"
            value={birthDate}
            onChange={setBirthDate}
            max={new Date().toISOString().slice(0, 10)}
          />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" type="button" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}

function DeleteCustomerModal({
  customer,
  onClose,
  afterDelete,
}: {
  customer: Customer;
  onClose: () => void;
  afterDelete: "refresh" | "list";
}) {
  const router = useRouter();
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  const confirmed = typed === "DELETE";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!confirmed) return;
    setBusy(true);
    const result = await deleteCustomerAction(customer.id);
    setBusy(false);
    if (!result.ok) {
      setFeedback({ ok: false, message: result.error ?? "Could not delete this contact." });
      return;
    }
    setFeedback({ ok: true, message: `Deleted ${customer.name}.` });
  }

  if (feedback) {
    return (
      <ModalShell title={feedback.ok ? "Contact deleted" : "Delete failed"} onClose={onClose}>
        <FeedbackBody
          ok={feedback.ok}
          message={feedback.message}
          onOk={() => {
            if (feedback.ok) {
              onClose();
              if (afterDelete === "list") router.push("/customers");
              router.refresh();
              return;
            }
            setFeedback(null);
          }}
        />
      </ModalShell>
    );
  }

  return (
    <ModalShell title={`Delete ${customer.name}?`} onClose={onClose} busy={busy}>
      <p className="mt-2 text-sm text-muted">
        This cannot be undone. Addresses and conversations for this contact will
        also be removed. Type <span className="font-mono font-semibold text-foreground">DELETE</span>{" "}
        to confirm.
      </p>
      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoComplete="off"
          spellCheck={false}
          placeholder="DELETE"
          className={inputClass}
        />
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" type="button" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" variant="danger" disabled={busy || !confirmed}>
            {busy ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}

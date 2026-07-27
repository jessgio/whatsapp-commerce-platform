"use client";

import { useEffect, useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  deleteSegmentAction,
  previewSegmentCountAction,
  saveSegmentAction,
} from "@/app/(portal)/customers/segments/actions";
import { Button } from "@/components/ui";
import {
  OPS_BY_FIELD,
  OP_LABELS,
  SEGMENT_FIELD_OPTIONS,
  emptyRules,
  newCondition,
  type SegmentCondition,
  type SegmentDefinition,
  type SegmentField,
  type SegmentOp,
  type SegmentRules,
} from "@/lib/segments";
import { cn } from "@/lib/utils";

const inputClass =
  "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-merlot";

export function SegmentBuilder({
  initial,
  canEdit,
}: {
  initial?: SegmentDefinition | null;
  canEdit: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [rules, setRules] = useState<SegmentRules>(
    initial?.rules ?? emptyRules(),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Counted server-side against the whole customer base. Debounced because
  // every keystroke in a condition value produces a new rules object.
  // Keyed by the rules object it was counted for, so staleness is derived
  // rather than tracked in a second state.
  const [preview, setPreview] = useState<{
    rules: SegmentRules;
    count: number;
  } | null>(null);
  const previewStale = preview?.rules !== rules;

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const result = await previewSegmentCountAction(rules);
      if (cancelled || !result.ok) return;
      setPreview({ rules, count: result.count });
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [rules]);

  function updateCondition(id: string, patch: Partial<SegmentCondition>) {
    setRules((prev) => ({
      ...prev,
      conditions: prev.conditions.map((c) =>
        c.id === id ? { ...c, ...patch } : c,
      ),
    }));
  }

  function changeField(id: string, field: SegmentField) {
    const next = newCondition(field);
    updateCondition(id, { field: next.field, op: next.op, value: next.value });
  }

  function onSave() {
    setError(null);
    startTransition(async () => {
      const res = await saveSegmentAction({
        id: initial?.id,
        name,
        description,
        rules,
      });
      if (!res.ok) setError(res.error ?? "Failed to save.");
    });
  }

  function onDelete() {
    if (!initial?.id) return;
    if (!window.confirm(`Delete segment “${initial.name}”?`)) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteSegmentAction(initial.id);
      if (!res.ok) setError(res.error ?? "Failed to delete.");
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="text-sm font-medium text-foreground">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!canEdit}
            className={cn(inputClass, "mt-1.5")}
            placeholder="e.g. Jakarta high spenders"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-sm font-medium text-foreground">
            Description{" "}
            <span className="font-normal text-muted">(optional)</span>
          </label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={!canEdit}
            className={cn(inputClass, "mt-1.5")}
            placeholder="What this segment is for"
          />
        </div>
      </div>

      <div className="rounded-[16px] border border-border bg-surface p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-foreground">Rules</p>
            <p className="text-xs text-muted">
              Members are computed live from customer data — nothing is baked in.
            </p>
          </div>
          <select
            value={rules.match}
            disabled={!canEdit}
            onChange={(e) =>
              setRules((prev) => ({
                ...prev,
                match: e.target.value as SegmentRules["match"],
              }))
            }
            className={inputClass}
          >
            <option value="all">Match all conditions</option>
            <option value="any">Match any condition</option>
          </select>
        </div>

        <div className="space-y-3">
          {rules.conditions.map((c) => (
            <ConditionRow
              key={c.id}
              condition={c}
              canEdit={canEdit}
              onField={(field) => changeField(c.id, field)}
              onOp={(op) => updateCondition(c.id, { op })}
              onValue={(value) => updateCondition(c.id, { value })}
              onRemove={() =>
                setRules((prev) => ({
                  ...prev,
                  conditions: prev.conditions.filter((x) => x.id !== c.id),
                }))
              }
              canRemove={rules.conditions.length > 1}
            />
          ))}
        </div>

        {canEdit && (
          <button
            type="button"
            onClick={() =>
              setRules((prev) => ({
                ...prev,
                conditions: [...prev.conditions, newCondition("city")],
              }))
            }
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-merlot hover:underline"
          >
            <Plus size={15} /> Add condition
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-merlot/30 bg-merlot/5 px-4 py-3">
        <p className="text-sm text-foreground">
          <span className={cn("font-semibold", previewStale && "text-muted")}>
            {preview?.count ?? "—"}
          </span>{" "}
          <span className="text-muted">customers match right now</span>
        </p>
      </div>

      {error && (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      {canEdit && (
        <div className="flex flex-wrap gap-2">
          <Button type="button" disabled={pending} onClick={onSave}>
            {pending ? "Saving…" : initial ? "Save changes" : "Create segment"}
          </Button>
          {initial && (
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={onDelete}
            >
              <Trash2 size={15} /> Delete
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function ConditionRow({
  condition,
  canEdit,
  onField,
  onOp,
  onValue,
  onRemove,
  canRemove,
}: {
  condition: SegmentCondition;
  canEdit: boolean;
  onField: (field: SegmentField) => void;
  onOp: (op: SegmentOp) => void;
  onValue: (value: SegmentCondition["value"]) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const ops = OPS_BY_FIELD[condition.field];
  const needsValue = !["never", "is_empty", "is_not_empty"].includes(condition.op);
  const isBetween = condition.op === "between";
  const range = Array.isArray(condition.value) ? condition.value : [0, 0];

  return (
    <div className="grid gap-2 rounded-xl border border-border bg-background/60 p-3 sm:grid-cols-[1.2fr_1fr_1.4fr_auto]">
      <select
        value={condition.field}
        disabled={!canEdit}
        onChange={(e) => onField(e.target.value as SegmentField)}
        className={inputClass}
      >
        {SEGMENT_FIELD_OPTIONS.map((f) => (
          <option key={f.value} value={f.value}>
            {f.label}
          </option>
        ))}
      </select>

      <select
        value={condition.op}
        disabled={!canEdit}
        onChange={(e) => onOp(e.target.value as SegmentOp)}
        className={inputClass}
      >
        {ops.map((op) => (
          <option key={op} value={op}>
            {OP_LABELS[op]}
          </option>
        ))}
      </select>

      <div>
        {!needsValue ? (
          <p className="px-1 py-2 text-xs text-muted">No value needed</p>
        ) : condition.field === "consent_status" ? (
          <select
            value={String(condition.value ?? "opted_in")}
            disabled={!canEdit}
            onChange={(e) => onValue(e.target.value)}
            className={inputClass}
          >
            <option value="opted_in">opted_in</option>
            <option value="pending">pending</option>
            <option value="opted_out">opted_out</option>
          </select>
        ) : isBetween ? (
          <div className="flex items-center gap-2">
            <input
              type="number"
              disabled={!canEdit}
              value={range[0]}
              onChange={(e) =>
                onValue([Number(e.target.value), Number(range[1] ?? 0)])
              }
              className={inputClass}
            />
            <span className="text-xs text-muted">to</span>
            <input
              type="number"
              disabled={!canEdit}
              value={range[1]}
              onChange={(e) =>
                onValue([Number(range[0] ?? 0), Number(e.target.value)])
              }
              className={inputClass}
            />
          </div>
        ) : condition.field === "city" ||
          condition.field === "tag" ||
          condition.field === "legacy_segment" ? (
          <input
            type="text"
            disabled={!canEdit}
            value={String(condition.value ?? "")}
            onChange={(e) => onValue(e.target.value)}
            className={inputClass}
            placeholder={
              condition.field === "city" ? "Jakarta" : "e.g. qr_lead / VIP"
            }
          />
        ) : (
          <input
            type="number"
            disabled={!canEdit}
            value={
              typeof condition.value === "number" || typeof condition.value === "string"
                ? condition.value
                : 0
            }
            onChange={(e) => onValue(Number(e.target.value))}
            className={inputClass}
            placeholder={
              condition.field === "lifetime_value" ? "1000000" : "value"
            }
          />
        )}
      </div>

      {canEdit && (
        <button
          type="button"
          disabled={!canRemove}
          onClick={onRemove}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-muted hover:bg-danger/10 hover:text-danger disabled:opacity-30"
          aria-label="Remove condition"
        >
          <Trash2 size={15} />
        </button>
      )}
    </div>
  );
}

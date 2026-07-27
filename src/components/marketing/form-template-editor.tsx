"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui";
import { saveFormFieldsAction } from "@/app/(portal)/marketing/design/form/actions";
import {
  OPTIONAL_SYSTEM_KEYS,
  REQUIRED_SYSTEM_KEYS,
  createCustomField,
  createSystemField,
  isSystemFieldKey,
  type FormField,
  type FormPageCopy,
  type FormTemplate,
  type SystemFormFieldKey,
} from "@/lib/form-templates";
import { cn } from "@/lib/utils";

const fieldClass =
  "mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition focus:border-merlot focus:ring-2 focus:ring-merlot/20";

function SortableFieldRow({
  field,
  selected,
  locked,
  onSelect,
  onRemove,
}: {
  field: FormField;
  selected: boolean;
  locked: boolean;
  onSelect: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: field.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        "flex items-center gap-2 rounded-lg border px-2 py-2",
        selected
          ? "border-merlot/50 bg-merlot/5"
          : "border-border bg-surface-muted/40",
        isDragging && "opacity-70 shadow-md",
      )}
    >
      <button
        type="button"
        className="cursor-grab text-muted touch-none"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
      >
        <GripVertical size={16} />
      </button>
      <button
        type="button"
        onClick={onSelect}
        className="min-w-0 flex-1 text-left"
      >
        <p className="truncate text-sm font-medium text-foreground">
          {field.label}
        </p>
        <p className="truncate text-xs text-muted">
          {field.key} · {field.type}
          {field.required ? " · required" : ""}
        </p>
      </button>
      {!locked ? (
        <button
          type="button"
          onClick={onRemove}
          className="rounded p-1.5 text-muted hover:bg-danger/10 hover:text-danger"
          aria-label="Remove field"
        >
          <Trash2 size={14} />
        </button>
      ) : null}
    </div>
  );
}

function FormLivePreview({
  formPage,
  fields,
}: {
  formPage: FormPageCopy;
  fields: FormField[];
}) {
  return (
    <div className="rounded-[20px] border border-border bg-surface p-6 shadow-[0_12px_40px_rgba(45,43,42,0.10)]">
      <div className="mb-5 flex items-center gap-2.5">
        <BrandMark size={40} />
        <div>
          <p className="text-lg font-semibold tracking-tight text-foreground">
            {formPage.brandTitle}
          </p>
          <p className="text-xs text-muted">{formPage.eyebrow}</p>
        </div>
      </div>
      <h1 className="text-xl font-semibold text-foreground">
        {formPage.headline}
      </h1>
      <p className="mt-1 text-sm text-muted">{formPage.intro}</p>
      <div className="mt-5 space-y-3">
        {fields.map((f) => (
          <div key={f.id}>
            {f.type === "terms" ? (
              <fieldset className="rounded-lg border border-border bg-surface-muted/60 p-3">
                <legend className="px-1 text-xs font-semibold">
                  {f.label}
                </legend>
                <p className="text-xs leading-relaxed text-muted">
                  {f.termsText || "Terms text…"}
                </p>
              </fieldset>
            ) : (
              <>
                <label className="text-xs font-medium text-foreground">
                  {f.label}
                  {!f.required ? (
                    <span className="font-normal text-muted"> (Opsional)</span>
                  ) : null}
                </label>
                <div className="mt-1 h-9 rounded-lg border border-dashed border-border bg-surface-muted/30" />
              </>
            )}
          </div>
        ))}
        <div className="rounded-lg bg-merlot px-3 py-2.5 text-center text-sm font-medium text-white">
          {formPage.submitLabel}
        </div>
      </div>
    </div>
  );
}

export function FormTemplateEditor({
  initial,
  canEdit = true,
}: {
  initial: FormTemplate;
  canEdit?: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [discountCode, setDiscountCode] = useState(initial.discountCode);
  const [formPage, setFormPage] = useState<FormPageCopy>(initial.formPage);
  const [fields, setFields] = useState<FormField[]>(initial.fields);
  const [selectedId, setSelectedId] = useState<string | null>(
    initial.fields[0]?.id ?? null,
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );

  const selected = fields.find((f) => f.id === selectedId) ?? null;
  const presentSystemKeys = useMemo(
    () =>
      new Set(
        fields.filter((f) => isSystemFieldKey(f.key)).map((f) => f.key),
      ),
    [fields],
  );
  const missingOptional = OPTIONAL_SYSTEM_KEYS.filter(
    (k) => !presentSystemKeys.has(k),
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function updateField(id: string, patch: Partial<FormField>) {
    setFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    );
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setFields((prev) => {
      const oldIndex = prev.findIndex((f) => f.id === active.id);
      const newIndex = prev.findIndex((f) => f.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  }

  function addCustom(type: "text" | "textarea" | "select" | "checkbox") {
    const field = createCustomField(type);
    setFields((prev) => [...prev, field]);
    setSelectedId(field.id);
  }

  function restoreSystem(key: SystemFormFieldKey) {
    if (presentSystemKeys.has(key)) return;
    const field = createSystemField(key);
    setFields((prev) => [...prev, field]);
    setSelectedId(field.id);
  }

  function removeField(id: string) {
    const field = fields.find((f) => f.id === id);
    if (!field) return;
    if (
      isSystemFieldKey(field.key) &&
      REQUIRED_SYSTEM_KEYS.includes(field.key)
    ) {
      return;
    }
    setFields((prev) => prev.filter((f) => f.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await saveFormFieldsAction({
        id: initial.id,
        name,
        formPage,
        fields,
        discountCode,
        isPublished: initial.isPublished,
      });
      setMessage({
        ok: res.ok,
        text: res.ok
          ? "Form template saved. Public /daftar will use this design."
          : (res.error ?? "Save failed."),
      });
      if (res.ok) router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="space-y-4">
        <div className="rounded-[14px] border border-border bg-surface p-5">
          <h2 className="text-sm font-semibold text-foreground">Form settings</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="text-sm font-medium">Template name</label>
              <input
                className={fieldClass}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Discount code</label>
              <input
                className={fieldClass}
                value={discountCode}
                onChange={(e) => setDiscountCode(e.target.value)}
                placeholder="AERIS15"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Submit label</label>
              <input
                className={fieldClass}
                value={formPage.submitLabel}
                onChange={(e) =>
                  setFormPage((p) => ({ ...p, submitLabel: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium">Brand title</label>
              <input
                className={fieldClass}
                value={formPage.brandTitle}
                onChange={(e) =>
                  setFormPage((p) => ({ ...p, brandTitle: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium">Eyebrow</label>
              <input
                className={fieldClass}
                value={formPage.eyebrow}
                onChange={(e) =>
                  setFormPage((p) => ({ ...p, eyebrow: e.target.value }))
                }
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium">Headline</label>
              <input
                className={fieldClass}
                value={formPage.headline}
                onChange={(e) =>
                  setFormPage((p) => ({ ...p, headline: e.target.value }))
                }
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium">Intro</label>
              <textarea
                className={cn(fieldClass, "min-h-[80px] resize-y")}
                value={formPage.intro}
                onChange={(e) =>
                  setFormPage((p) => ({ ...p, intro: e.target.value }))
                }
              />
            </div>
          </div>
        </div>

        <div className="rounded-[14px] border border-border bg-surface p-5">
          <h2 className="text-sm font-semibold text-foreground">Fields</h2>
          <p className="mt-1 text-xs text-muted">
            Name, phone, email, and terms cannot be removed. Birth date and city
            can be hidden. Add custom questions as needed.
          </p>

          <div className="mt-4 space-y-2">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={onDragEnd}
            >
              <SortableContext
                items={fields.map((f) => f.id)}
                strategy={verticalListSortingStrategy}
              >
                {fields.map((field) => (
                  <SortableFieldRow
                    key={field.id}
                    field={field}
                    selected={selectedId === field.id}
                    locked={
                      isSystemFieldKey(field.key) &&
                      REQUIRED_SYSTEM_KEYS.includes(field.key)
                    }
                    onSelect={() => setSelectedId(field.id)}
                    onRemove={() => removeField(field.id)}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>

          <div className="mt-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
              Add field
            </p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["text", "Short text"],
                  ["textarea", "Long text"],
                  ["select", "Select"],
                  ["checkbox", "Checkbox"],
                ] as const
              ).map(([type, label]) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => addCustom(type)}
                  className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface-muted/50 px-2.5 py-1.5 text-xs font-medium hover:border-merlot/40"
                >
                  <Plus size={12} />
                  {label}
                </button>
              ))}
              {missingOptional.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => restoreSystem(key)}
                  className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface-muted/50 px-2.5 py-1.5 text-xs font-medium hover:border-merlot/40"
                >
                  <Plus size={12} />
                  Restore {key}
                </button>
              ))}
            </div>
          </div>

          {selected ? (
            <div className="mt-5 space-y-3 rounded-lg border border-border bg-surface-muted/30 p-4">
              <h3 className="text-sm font-semibold">Field settings</h3>
              <div>
                <label className="text-sm font-medium">Label</label>
                <input
                  className={fieldClass}
                  value={selected.label}
                  onChange={(e) =>
                    updateField(selected.id, { label: e.target.value })
                  }
                />
              </div>
              {selected.type !== "terms" && selected.type !== "checkbox" ? (
                <div>
                  <label className="text-sm font-medium">Placeholder</label>
                  <input
                    className={fieldClass}
                    value={selected.placeholder ?? ""}
                    onChange={(e) =>
                      updateField(selected.id, { placeholder: e.target.value })
                    }
                  />
                </div>
              ) : null}
              <div>
                <label className="text-sm font-medium">Help text</label>
                <input
                  className={fieldClass}
                  value={selected.helpText ?? ""}
                  onChange={(e) =>
                    updateField(selected.id, { helpText: e.target.value })
                  }
                />
              </div>
              {selected.type === "terms" ? (
                <div>
                  <label className="text-sm font-medium">Terms copy</label>
                  <textarea
                    className={cn(fieldClass, "min-h-[100px] resize-y")}
                    value={selected.termsText ?? ""}
                    onChange={(e) =>
                      updateField(selected.id, { termsText: e.target.value })
                    }
                  />
                </div>
              ) : null}
              {selected.type === "select" ? (
                <div>
                  <label className="text-sm font-medium">
                    Options (label|value per line)
                  </label>
                  <textarea
                    className={cn(fieldClass, "min-h-[80px] font-mono text-xs")}
                    value={(selected.options ?? [])
                      .map((o) => `${o.label}|${o.value}`)
                      .join("\n")}
                    onChange={(e) => {
                      const options = e.target.value
                        .split("\n")
                        .map((line) => line.trim())
                        .filter(Boolean)
                        .map((line) => {
                          const [label, value] = line.split("|");
                          return {
                            label: (label ?? "").trim(),
                            value: (value ?? label ?? "").trim(),
                          };
                        })
                        .filter((o) => o.label && o.value);
                      updateField(selected.id, { options });
                    }}
                  />
                </div>
              ) : null}
              {!(
                isSystemFieldKey(selected.key) &&
                REQUIRED_SYSTEM_KEYS.includes(selected.key)
              ) ? (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selected.required}
                    onChange={(e) =>
                      updateField(selected.id, { required: e.target.checked })
                    }
                    className="size-4 accent-merlot"
                  />
                  Required
                </label>
              ) : (
                <p className="text-xs text-muted">This system field is always required.</p>
              )}
            </div>
          ) : null}

          {message ? (
            <p
              className={cn(
                "mt-4 rounded-lg px-3 py-2 text-sm",
                message.ok
                  ? "bg-success/10 text-success"
                  : "bg-danger/10 text-danger",
              )}
            >
              {message.text}
            </p>
          ) : null}

          {canEdit ? (
            <div className="mt-5 flex justify-end">
              <Button type="button" disabled={saving} onClick={handleSave}>
                {saving ? "Saving…" : "Save form"}
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="space-y-3 xl:sticky xl:top-4 xl:self-start">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Live preview</h2>
          <p className="text-xs text-muted">Phone-width form chrome — not submitted.</p>
        </div>
        <div className="mx-auto max-w-sm">
          <FormLivePreview formPage={formPage} fields={fields} />
        </div>
      </div>
    </div>
  );
}

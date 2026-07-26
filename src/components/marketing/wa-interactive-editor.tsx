"use client";

import { useState } from "react";
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
import { Button } from "@/components/ui";
import { WaInteractivePhonePreview } from "@/components/marketing/wa-phone-preview";
import { cn } from "@/lib/utils";
import {
  newId,
  type WaInteractiveDesign,
  type WaInteractiveKind,
  type WaReplyButton,
} from "@/lib/whatsapp-designs";

const fieldClass =
  "mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition focus:border-merlot focus:ring-2 focus:ring-merlot/20";

type SaveFn = (
  design: WaInteractiveDesign,
) => Promise<{ ok: boolean; error?: string }>;

function SortableReplyButton({
  button,
  onChange,
  onRemove,
}: {
  button: WaReplyButton;
  onChange: (next: WaReplyButton) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: button.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        "flex items-center gap-2 rounded-xl border border-border bg-surface p-3",
        isDragging && "opacity-80",
      )}
    >
      <button
        type="button"
        className="cursor-grab touch-none rounded p-1 text-muted hover:bg-surface-muted"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={15} />
      </button>
      <input
        className={cn(fieldClass, "mt-0")}
        maxLength={20}
        value={button.title}
        onChange={(e) => onChange({ ...button, title: e.target.value })}
        placeholder="Button title"
      />
      <button
        type="button"
        onClick={onRemove}
        className="rounded p-1.5 text-muted hover:bg-danger/10 hover:text-danger"
        aria-label="Remove"
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}

export function WaInteractiveEditor({
  initial,
  onSave,
}: {
  initial: WaInteractiveDesign;
  onSave: SaveFn;
}) {
  const [design, setDesign] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function patch(partial: Partial<WaInteractiveDesign>) {
    setDesign((d) => ({ ...d, ...partial }));
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = design.buttons.findIndex((b) => b.id === active.id);
    const newIndex = design.buttons.findIndex((b) => b.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    patch({ buttons: arrayMove(design.buttons, oldIndex, newIndex) });
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await onSave(design);
      setMessage({
        ok: res.ok,
        text: res.ok
          ? "Interactive design saved."
          : (res.error ?? "Save failed."),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-4">
        <div className="rounded-[14px] border border-border bg-surface p-5">
          <h2 className="text-sm font-semibold">Interactive message</h2>
          <p className="mt-1 text-xs text-muted">
            Session messages (text, image, reply buttons, lists) can only be sent
            inside the customer&apos;s 24-hour messaging window — not as cold
            broadcasts.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Internal name</label>
              <input
                className={fieldClass}
                value={design.name}
                onChange={(e) => patch({ name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Message type</label>
              <select
                className={fieldClass}
                value={design.kind}
                onChange={(e) =>
                  patch({ kind: e.target.value as WaInteractiveKind })
                }
              >
                <option value="text">Text</option>
                <option value="image">Image + caption</option>
                <option value="reply_buttons">Reply buttons</option>
                <option value="list">List menu</option>
              </select>
            </div>
          </div>
        </div>

        <div className="rounded-[14px] border border-border bg-surface p-5 space-y-3">
          <div>
            <label className="text-sm font-medium">Header (optional)</label>
            <input
              className={fieldClass}
              maxLength={60}
              value={design.headerText}
              onChange={(e) => patch({ headerText: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Body</label>
            <textarea
              className={cn(fieldClass, "min-h-[100px] resize-y")}
              maxLength={1024}
              value={design.body}
              onChange={(e) => patch({ body: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Footer (optional)</label>
            <input
              className={fieldClass}
              maxLength={60}
              value={design.footerText}
              onChange={(e) => patch({ footerText: e.target.value })}
            />
          </div>
          {design.kind === "image" ? (
            <div>
              <label className="text-sm font-medium">Image URL</label>
              <input
                className={fieldClass}
                value={design.imageUrl}
                onChange={(e) => patch({ imageUrl: e.target.value })}
                placeholder="https://…"
              />
            </div>
          ) : null}
        </div>

        {design.kind === "reply_buttons" ? (
          <div className="rounded-[14px] border border-border bg-surface p-5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold">Reply buttons</h2>
                <p className="text-xs text-muted">Max 3 · drag to reorder</p>
              </div>
              <Button
                type="button"
                variant="secondary"
                disabled={design.buttons.length >= 3}
                onClick={() =>
                  patch({
                    buttons: [
                      ...design.buttons,
                      { id: newId("btn"), title: "Option" },
                    ],
                  })
                }
              >
                <Plus size={14} /> Add
              </Button>
            </div>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={onDragEnd}
            >
              <SortableContext
                items={design.buttons.map((b) => b.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="mt-3 space-y-2">
                  {design.buttons.map((button) => (
                    <SortableReplyButton
                      key={button.id}
                      button={button}
                      onChange={(next) =>
                        patch({
                          buttons: design.buttons.map((b) =>
                            b.id === button.id ? next : b,
                          ),
                        })
                      }
                      onRemove={() =>
                        patch({
                          buttons: design.buttons.filter(
                            (b) => b.id !== button.id,
                          ),
                        })
                      }
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        ) : null}

        {design.kind === "list" ? (
          <div className="rounded-[14px] border border-border bg-surface p-5 space-y-3">
            <div>
              <label className="text-sm font-medium">List button label</label>
              <input
                className={fieldClass}
                maxLength={20}
                value={design.listButtonLabel}
                onChange={(e) => patch({ listButtonLabel: e.target.value })}
              />
            </div>
            {(design.listSections[0]?.rows ?? []).map((row, idx) => (
              <div
                key={row.id}
                className="grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-[1fr_1fr_auto]"
              >
                <div>
                  <label className="text-xs text-muted">Title</label>
                  <input
                    className={fieldClass}
                    maxLength={24}
                    value={row.title}
                    onChange={(e) => {
                      const sections = [...design.listSections];
                      const sec = sections[0];
                      if (!sec) return;
                      const rows = [...sec.rows];
                      rows[idx] = { ...row, title: e.target.value };
                      sections[0] = { ...sec, rows };
                      patch({ listSections: sections });
                    }}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted">Description</label>
                  <input
                    className={fieldClass}
                    maxLength={72}
                    value={row.description ?? ""}
                    onChange={(e) => {
                      const sections = [...design.listSections];
                      const sec = sections[0];
                      if (!sec) return;
                      const rows = [...sec.rows];
                      rows[idx] = { ...row, description: e.target.value };
                      sections[0] = { ...sec, rows };
                      patch({ listSections: sections });
                    }}
                  />
                </div>
                <button
                  type="button"
                  className="self-end rounded p-2 text-muted hover:bg-danger/10 hover:text-danger"
                  onClick={() => {
                    const sections = [...design.listSections];
                    const sec = sections[0];
                    if (!sec) return;
                    sections[0] = {
                      ...sec,
                      rows: sec.rows.filter((r) => r.id !== row.id),
                    };
                    patch({ listSections: sections });
                  }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                const sections = [...design.listSections];
                const sec = sections[0] ?? {
                  id: newId("sec"),
                  title: "Options",
                  rows: [],
                };
                sections[0] = {
                  ...sec,
                  rows: [
                    ...sec.rows,
                    { id: newId("row"), title: "Item", description: "" },
                  ],
                };
                patch({ listSections: sections });
              }}
            >
              <Plus size={14} /> Add row
            </Button>
          </div>
        ) : null}

        {message ? (
          <p
            className={cn(
              "rounded-lg px-3 py-2 text-sm",
              message.ok
                ? "bg-success/10 text-success"
                : "bg-danger/10 text-danger",
            )}
          >
            {message.text}
          </p>
        ) : null}

        <div className="flex justify-end">
          <Button type="button" disabled={saving} onClick={handleSave}>
            {saving ? "Saving…" : "Save design"}
          </Button>
        </div>
      </div>

      <div className="xl:sticky xl:top-4 xl:self-start">
        <WaInteractivePhonePreview design={design} />
      </div>
    </div>
  );
}

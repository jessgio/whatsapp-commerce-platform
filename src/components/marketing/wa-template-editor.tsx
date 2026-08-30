"use client";

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
import { Button, Select } from "@/components/ui";
import { WaTemplatePhonePreview } from "@/components/marketing/wa-phone-preview";
import { cn } from "@/lib/utils";
import {
  extractTemplateVars,
  newId,
  type WaTemplateButton,
  type WaTemplateCategory,
  type WaTemplateDesign,
  type WaTemplateHeader,
} from "@/lib/whatsapp-designs";

const fieldClass =
  "mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition focus:border-merlot focus:ring-2 focus:ring-merlot/20";

type SaveFn = (
  design: WaTemplateDesign,
) => Promise<{ ok: boolean; error?: string }>;

function SortableButtonRow({
  button,
  onChange,
  onRemove,
}: {
  button: WaTemplateButton;
  onChange: (next: WaTemplateButton) => void;
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
        "rounded-xl border border-border bg-surface p-3",
        isDragging && "opacity-80",
      )}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          className="mt-1 cursor-grab touch-none rounded p-1 text-muted hover:bg-surface-muted"
          aria-label="Drag to reorder"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={15} />
        </button>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-muted">Type</label>
              <Select
                className="mt-1 w-full"
                value={button.type}
                onChange={(v) => {
                  const type = v as WaTemplateButton["type"];
                  if (type === "quick_reply") {
                    onChange({ id: button.id, type, text: button.text });
                  } else if (type === "url") {
                    onChange({
                      id: button.id,
                      type,
                      text: button.text,
                      url: "url" in button ? button.url : "https://",
                    });
                  } else {
                    onChange({
                      id: button.id,
                      type,
                      text: button.text,
                      phone: "phone" in button ? button.phone : "",
                    });
                  }
                }}
                options={[
                  { value: "quick_reply", label: "Quick reply" },
                  { value: "url", label: "URL" },
                  { value: "phone", label: "Phone" },
                ]}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted">Label</label>
              <input
                className={fieldClass}
                maxLength={25}
                value={button.text}
                onChange={(e) => onChange({ ...button, text: e.target.value })}
              />
            </div>
          </div>
          {button.type === "url" ? (
            <div>
              <label className="text-xs font-medium text-muted">URL</label>
              <input
                className={fieldClass}
                value={button.url}
                onChange={(e) => onChange({ ...button, url: e.target.value })}
              />
            </div>
          ) : null}
          {button.type === "phone" ? (
            <div>
              <label className="text-xs font-medium text-muted">Phone</label>
              <input
                className={fieldClass}
                value={button.phone}
                onChange={(e) => onChange({ ...button, phone: e.target.value })}
              />
            </div>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="rounded p-1.5 text-muted hover:bg-danger/10 hover:text-danger"
          aria-label="Remove button"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}

export function WaTemplateEditor({
  initial,
  onSave,
}: {
  initial: WaTemplateDesign;
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

  const vars = useMemo(() => extractTemplateVars(design.body), [design.body]);

  function patch(partial: Partial<WaTemplateDesign>) {
    setDesign((d) => ({ ...d, ...partial }));
  }

  function setHeader(header: WaTemplateHeader) {
    patch({ header });
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
        text: res.ok ? "Template design saved." : (res.error ?? "Save failed."),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-4">
        <div className="rounded-[14px] border border-border bg-surface p-5">
          <h2 className="text-sm font-semibold text-foreground">
            Template details
          </h2>
          <p className="mt-1 text-xs text-muted">
            Structure matches Meta WhatsApp templates (header, body, footer,
            buttons). Use <code className="rounded bg-surface-muted px-1">{"{{1}}"}</code>{" "}
            variables in the body. The Meta template name must already be approved.
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
              <label className="text-sm font-medium">Meta template name</label>
              <input
                className={fieldClass}
                value={design.metaTemplateName}
                onChange={(e) => patch({ metaTemplateName: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Language</label>
              <input
                className={fieldClass}
                value={design.languageCode}
                onChange={(e) => patch({ languageCode: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Category</label>
              <Select
                className="mt-1 w-full"
                value={design.category}
                onChange={(v) =>
                  patch({ category: v as WaTemplateCategory })
                }
                options={[
                  { value: "MARKETING", label: "Marketing" },
                  { value: "UTILITY", label: "Utility" },
                  { value: "AUTHENTICATION", label: "Authentication" },
                ]}
              />
            </div>
          </div>
        </div>

        <div className="rounded-[14px] border border-border bg-surface p-5">
          <h2 className="text-sm font-semibold">Header</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Type</label>
              <Select
                className="mt-1 w-full"
                value={design.header.type}
                onChange={(v) => {
                  const type = v as WaTemplateHeader["type"];
                  if (type === "none") setHeader({ type: "none" });
                  else if (type === "text")
                    setHeader({ type: "text", text: "Aeris Beauté" });
                  else setHeader({ type: "image", imageUrl: "" });
                }}
                options={[
                  { value: "none", label: "None" },
                  { value: "text", label: "Text" },
                  { value: "image", label: "Image" },
                ]}
              />
            </div>
            {design.header.type === "text" ? (
              <div>
                <label className="text-sm font-medium">Header text</label>
                <input
                  className={fieldClass}
                  maxLength={60}
                  value={design.header.text}
                  onChange={(e) =>
                    setHeader({ type: "text", text: e.target.value })
                  }
                />
              </div>
            ) : null}
            {design.header.type === "image" ? (
              <div>
                <label className="text-sm font-medium">Image URL</label>
                <input
                  className={fieldClass}
                  value={design.header.imageUrl}
                  onChange={(e) =>
                    setHeader({ type: "image", imageUrl: e.target.value })
                  }
                  placeholder="https://…"
                />
              </div>
            ) : null}
          </div>
        </div>

        <div className="rounded-[14px] border border-border bg-surface p-5">
          <h2 className="text-sm font-semibold">Body</h2>
          <textarea
            className={cn(fieldClass, "min-h-[120px] resize-y")}
            value={design.body}
            maxLength={1024}
            onChange={(e) => patch({ body: e.target.value })}
          />
          {vars.length > 0 ? (
            <div className="mt-3 space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">
                Variable preview defaults
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {vars.map((v) => (
                  <div key={v}>
                    <label className="text-xs text-muted">{`{{${v}}}`}</label>
                    <input
                      className={fieldClass}
                      value={design.variableDefaults[v] ?? ""}
                      onChange={(e) =>
                        patch({
                          variableDefaults: {
                            ...design.variableDefaults,
                            [v]: e.target.value,
                          },
                        })
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          <div className="mt-3">
            <label className="text-sm font-medium">Footer</label>
            <input
              className={fieldClass}
              maxLength={60}
              value={design.footer}
              onChange={(e) => patch({ footer: e.target.value })}
            />
          </div>
        </div>

        <div className="rounded-[14px] border border-border bg-surface p-5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold">Buttons</h2>
              <p className="text-xs text-muted">
                Up to 3 buttons · drag to reorder
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              disabled={design.buttons.length >= 3}
              onClick={() =>
                patch({
                  buttons: [
                    ...design.buttons,
                    {
                      id: newId("btn"),
                      type: "quick_reply",
                      text: "Reply",
                    },
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
                  <SortableButtonRow
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
                        buttons: design.buttons.filter((b) => b.id !== button.id),
                      })
                    }
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

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

          <div className="mt-5 flex justify-end">
            <Button type="button" disabled={saving} onClick={handleSave}>
              {saving ? "Saving…" : "Save design"}
            </Button>
          </div>
        </div>
      </div>

      <div className="xl:sticky xl:top-4 xl:self-start">
        <WaTemplatePhonePreview design={design} />
      </div>
    </div>
  );
}

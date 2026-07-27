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
import {
  GripVertical,
  ImagePlus,
  Plus,
  Trash2,
} from "lucide-react";
import { LeadWelcomeEmail } from "@/emails/lead-welcome";
import {
  createEmailAssetUploadSlotAction,
  saveLeadWelcomeEmailAction,
} from "@/app/(portal)/marketing/design/email/actions";
import { FormThankYouView } from "@/components/leads/form-thank-you-view";
import { ImageResizeModal } from "@/components/settings/image-resize-modal";
import {
  ButtonStyleControls,
  DividerStyleControls,
  ImageStyleControls,
  TextStyleControls,
} from "@/components/settings/email-style-controls";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  BLOCK_LABELS,
  createBlock,
  type EmailBlock,
  type EmailBlockType,
} from "@/lib/email-blocks";
import type { EmailCustomFont } from "@/lib/email-fonts";
import type { EmailTemplate } from "@/lib/email-templates";
import { LEAD_DISCOUNT_CODE } from "@/lib/lead-offer";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

const fieldClass =
  "mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition focus:border-merlot focus:ring-2 focus:ring-merlot/20";

const ADDABLE: EmailBlockType[] = [
  "image",
  "header",
  "heading",
  "text",
  "discount",
  "button",
  "spacer",
  "divider",
  "footer",
];

function SortableBlockCard({
  block,
  selected,
  onSelect,
  onChange,
  onRemove,
  onPickImage,
  uploading,
  accentColor,
  customFonts,
}: {
  block: EmailBlock;
  selected: boolean;
  onSelect: () => void;
  onChange: (next: EmailBlock) => void;
  onRemove: () => void;
  onPickImage: (file: File, field: "src" | "logoUrl") => void;
  uploading: boolean;
  accentColor: string;
  customFonts: EmailCustomFont[];
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-xl border bg-surface p-3 shadow-[0_1px_2px_rgba(45,43,42,0.04)]",
        selected ? "border-merlot ring-2 ring-merlot/20" : "border-border",
        isDragging && "opacity-80",
      )}
      onClick={onSelect}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="cursor-grab touch-none rounded p-1 text-muted hover:bg-surface-muted hover:text-foreground active:cursor-grabbing"
          aria-label="Drag to reorder"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical size={16} />
        </button>
        <span className="flex-1 text-sm font-medium text-foreground">
          {BLOCK_LABELS[block.type]}
        </span>
        <button
          type="button"
          className="rounded p-1 text-muted hover:bg-danger/10 hover:text-danger"
          aria-label="Remove block"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <Trash2 size={15} />
        </button>
      </div>

      <div className="mt-3 space-y-2" onClick={(e) => e.stopPropagation()}>
        {block.type === "header" && (
          <>
            <input
              className={fieldClass}
              value={block.brandName}
              onChange={(e) => onChange({ ...block, brandName: e.target.value })}
              placeholder="Brand name"
            />

            <div className="rounded-lg border border-border bg-surface-muted/40 p-3">
              <p className="text-xs font-medium text-foreground">Brand logo</p>
              {block.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={block.logoUrl}
                  alt="Brand logo"
                  className="mt-2 max-h-16 object-contain"
                />
              ) : (
                <p className="mt-1 text-[11px] text-muted">
                  No logo yet — the letter mark is used instead (if enabled).
                </p>
              )}
              <div className="mt-2 flex flex-wrap gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-foreground hover:bg-surface-muted">
                  <ImagePlus size={14} />
                  {uploading ? "Uploading…" : "Upload logo"}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) onPickImage(file, "logoUrl");
                      e.target.value = "";
                    }}
                  />
                </label>
                {block.logoUrl ? (
                  <button
                    type="button"
                    className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted hover:bg-danger/10 hover:text-danger"
                    onClick={() => onChange({ ...block, logoUrl: "" })}
                  >
                    Remove logo
                  </button>
                ) : null}
              </div>
              <input
                className={fieldClass}
                value={block.logoUrl ?? ""}
                onChange={(e) => onChange({ ...block, logoUrl: e.target.value })}
                placeholder="Or paste logo URL"
              />
            </div>

            <label className="flex items-center gap-2 text-xs text-foreground">
              <input
                type="checkbox"
                checked={block.showMark}
                onChange={(e) =>
                  onChange({ ...block, showMark: e.target.checked })
                }
                className="accent-merlot"
                disabled={Boolean(block.logoUrl?.trim())}
              />
              Show “A” mark{" "}
              {block.logoUrl?.trim() ? (
                <span className="text-muted">(hidden while logo is set)</span>
              ) : null}
            </label>
            <TextStyleControls
              style={block.style}
              onChange={(style) => onChange({ ...block, style })}
              defaults={{
                fontFamily: "sans",
                fontSize: 18,
                fontWeight: 600,
                align: "center",
                color: "#fbf6ee",
              }}
              customFonts={customFonts}
              showLineHeight={false}
              showLetterSpacing
            />
          </>
        )}

        {block.type === "image" && (
          <>
            {block.src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={block.src}
                alt={block.alt}
                className="max-h-28 w-full rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-20 items-center justify-center rounded-lg border border-dashed border-border bg-surface-muted text-xs text-muted">
                No image yet
              </div>
            )}
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-surface-muted">
              <ImagePlus size={14} />
              {uploading ? "Uploading…" : "Upload & resize"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onPickImage(file, "src");
                  e.target.value = "";
                }}
              />
            </label>
            <input
              className={fieldClass}
              value={block.src}
              onChange={(e) => onChange({ ...block, src: e.target.value })}
              placeholder="Or paste image URL"
            />
            <input
              className={fieldClass}
              value={block.href ?? ""}
              onChange={(e) => onChange({ ...block, href: e.target.value })}
              placeholder="Click-through link (https://…)"
            />
            <input
              className={fieldClass}
              value={block.alt}
              onChange={(e) => onChange({ ...block, alt: e.target.value })}
              placeholder="Alt text"
            />
            <ImageStyleControls
              style={block.style}
              onChange={(style) => onChange({ ...block, style })}
            />
          </>
        )}

        {(block.type === "heading" ||
          block.type === "text" ||
          block.type === "footer") && (
          <>
            <textarea
              className={fieldClass}
              rows={block.type === "heading" ? 2 : 4}
              value={block.text}
              onChange={(e) => onChange({ ...block, text: e.target.value })}
              placeholder={
                block.type === "heading"
                  ? "Hello, {name}"
                  : "Visit [our shop](https://aerisbeaute.com) — use {name} for first name"
              }
            />
            <p className="text-[11px] leading-relaxed text-muted">
              Markdown:{" "}
              <code className="rounded bg-surface-muted px-1">
                [label](https://…)
              </code>
              ,{" "}
              <code className="rounded bg-surface-muted px-1">
                {"[Perbarui]({edit_url})"}
              </code>
              ,{" "}
              <code className="rounded bg-surface-muted px-1">**bold**</code>,{" "}
              <code className="rounded bg-surface-muted px-1">*italic*</code>
            </p>
            <TextStyleControls
              style={block.style}
              onChange={(style) => onChange({ ...block, style })}
              defaults={
                block.type === "heading"
                  ? {
                      fontFamily: "serif",
                      fontSize: 24,
                      fontWeight: 600,
                      align: "left",
                      color: "#2d2b2a",
                    }
                  : block.type === "footer"
                    ? {
                        fontFamily: "sans",
                        fontSize: 12,
                        fontWeight: 400,
                        align: "center",
                        color: "#8a7e72",
                      }
                    : {
                        fontFamily: "sans",
                        fontSize: 16,
                        fontWeight: 400,
                        align: "left",
                        color: "#8a7e72",
                      }
              }
              customFonts={customFonts}
              showLetterSpacing={block.type === "heading"}
            />
          </>
        )}

        {block.type === "discount" && (
          <>
            <input
              className={fieldClass}
              value={block.label}
              onChange={(e) => onChange({ ...block, label: e.target.value })}
              placeholder="Discount label"
            />
            <TextStyleControls
              style={block.style}
              onChange={(style) => onChange({ ...block, style })}
              defaults={{
                fontFamily: "sans",
                fontSize: 11,
                fontWeight: 400,
                align: "center",
                color: "#8a7e72",
              }}
              customFonts={customFonts}
              showLineHeight={false}
              showLetterSpacing
            />
          </>
        )}

        {block.type === "button" && (
          <>
            <input
              className={fieldClass}
              value={block.label}
              onChange={(e) => onChange({ ...block, label: e.target.value })}
              placeholder="Button label"
            />
            <input
              className={fieldClass}
              value={block.href}
              onChange={(e) => onChange({ ...block, href: e.target.value })}
              placeholder="https://"
            />
            <ButtonStyleControls
              style={block.style}
              onChange={(style) => onChange({ ...block, style })}
              accentFallback={accentColor}
              customFonts={customFonts}
            />
          </>
        )}

        {block.type === "spacer" && (
          <label className="block text-xs text-muted">
            Height (px)
            <input
              type="number"
              min={8}
              max={160}
              className={fieldClass}
              value={block.height}
              onChange={(e) =>
                onChange({
                  ...block,
                  height: Number(e.target.value) || 24,
                })
              }
            />
          </label>
        )}

        {block.type === "divider" && (
          <DividerStyleControls
            style={block.style}
            onChange={(style) => onChange({ ...block, style })}
          />
        )}
      </div>
    </div>
  );
}

type EmailSaveInput = {
  id: string;
  name: string;
  subject: string;
  accentColor: string;
  blocks: EmailBlock[];
  description?: string | null;
};

type EmailSaveResult = { ok: boolean; error?: string };

export function EmailTemplateEditor({
  initial,
  onSave,
  customFonts = [],
  showNameField = true,
  showSubjectField = true,
  successMessage = "Template saved.",
  saveLabel = "Save template",
  previewVariant = "email",
  discountCode = LEAD_DISCOUNT_CODE,
}: {
  initial: EmailTemplate;
  /** Pass a server action reference — do not wrap in an inline closure from a Server Component. */
  onSave?: (input: EmailSaveInput) => Promise<EmailSaveResult>;
  customFonts?: EmailCustomFont[];
  showNameField?: boolean;
  showSubjectField?: boolean;
  successMessage?: string;
  saveLabel?: string;
  /** `web` uses the form thank-you landing preview instead of the email chrome. */
  previewVariant?: "email" | "web";
  discountCode?: string;
}) {
  const [name, setName] = useState(initial.name);
  const [subject, setSubject] = useState(initial.subject);
  const [accentColor, setAccentColor] = useState(initial.accentColor);
  const [blocks, setBlocks] = useState<EmailBlock[]>(initial.blocks);
  const [selectedId, setSelectedId] = useState<string | null>(
    initial.blocks[0]?.id ?? null,
  );
  const [previewName, setPreviewName] = useState("Adinda");
  const [saving, setSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [resizeTarget, setResizeTarget] = useState<{
    blockId: string;
    file: File;
    field: "src" | "logoUrl";
  } | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const previewTemplate = useMemo<EmailTemplate>(
    () => ({
      id: initial.id,
      name,
      description: initial.description,
      kind: initial.kind,
      subject,
      accentColor,
      blocks,
      updatedAt: initial.updatedAt,
    }),
    [
      initial.id,
      initial.description,
      initial.kind,
      initial.updatedAt,
      name,
      subject,
      accentColor,
      blocks,
    ],
  );

  function updateBlock(id: string, next: EmailBlock) {
    setBlocks((prev) => prev.map((b) => (b.id === id ? next : b)));
  }

  function removeBlock(id: string) {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  function addBlock(type: EmailBlockType) {
    const block = createBlock(type);
    setBlocks((prev) => [...prev, block]);
    setSelectedId(block.id);
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setBlocks((prev) => {
      const oldIndex = prev.findIndex((b) => b.id === active.id);
      const newIndex = prev.findIndex((b) => b.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  }

  async function handleUpload(
    blockId: string,
    file: File,
    field: "src" | "logoUrl",
  ) {
    setUploadingId(blockId);
    setMessage(null);
    try {
      const slot = await createEmailAssetUploadSlotAction({
        filename: file.name || "upload.jpg",
        contentType: file.type,
        size: file.size,
      });
      if (!slot.ok) {
        setMessage({ ok: false, text: slot.error ?? "Upload failed." });
        return;
      }

      let publicUrl = slot.publicUrl ?? "";

      if (slot.demo) {
        // No Supabase — keep a local preview URL (not emailed in production).
        publicUrl = URL.createObjectURL(file);
      } else {
        if (!slot.path || !slot.token) {
          setMessage({ ok: false, text: "Upload slot incomplete." });
          return;
        }
        const supabase = createSupabaseBrowserClient();
        const { error } = await supabase.storage
          .from("email-assets")
          .uploadToSignedUrl(slot.path, slot.token, file, {
            contentType: file.type || undefined,
            cacheControl: "3600",
          });
        if (error) {
          setMessage({ ok: false, text: error.message || "Upload to storage failed." });
          return;
        }
        if (!publicUrl) {
          publicUrl = supabase.storage.from("email-assets").getPublicUrl(slot.path)
            .data.publicUrl;
        }
      }

      setBlocks((prev) =>
        prev.map((b) => {
          if (b.id !== blockId) return b;
          if (field === "logoUrl" && b.type === "header") {
            return { ...b, logoUrl: publicUrl };
          }
          if (field === "src" && b.type === "image") {
            return { ...b, src: publicUrl };
          }
          return b;
        }),
      );
      setMessage({
        ok: true,
        text:
          field === "logoUrl"
            ? "Logo uploaded. Remember to save the template."
            : "Image uploaded. Remember to save the template.",
      });
    } catch (e) {
      setMessage({
        ok: false,
        text: e instanceof Error ? e.message : "Upload failed unexpectedly.",
      });
    } finally {
      setUploadingId(null);
    }
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const save =
        onSave ??
        (async (input) =>
          saveLeadWelcomeEmailAction({
            subject: input.subject,
            accentColor: input.accentColor,
            blocks: input.blocks,
            name: input.name,
          }));
      const res = await save({
        id: initial.id,
        name,
        subject,
        accentColor,
        blocks,
        description: initial.description,
      });
      setMessage({
        ok: res.ok,
        text: res.ok ? successMessage : (res.error ?? "Save failed."),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="space-y-4">
        <div className="rounded-[14px] border border-border bg-surface p-5">
          <h2 className="text-sm font-semibold text-foreground">
            {previewVariant === "web" ? "Landing page settings" : "Email settings"}
          </h2>
          <p className="mt-1 text-xs text-muted">
            Placeholders:{" "}
            <code className="rounded bg-surface-muted px-1">{"{name}"}</code>
            {previewVariant === "email" ? (
              <>
                ,{" "}
                <code className="rounded bg-surface-muted px-1">
                  {"{edit_url}"}
                </code>
              </>
            ) : null}
            . Per-block controls: font, size, weight, alignment, color, and
            layout. Text also supports markdown links, bold, and italic.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {showNameField ? (
              <div className="sm:col-span-2">
                <label className="text-sm font-medium text-foreground">
                  Template name
                </label>
                <input
                  className={fieldClass}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Reorder nurture"
                />
              </div>
            ) : null}
            {showSubjectField ? (
              <div className="sm:col-span-2">
                <label className="text-sm font-medium text-foreground">
                  Subject line
                </label>
                <input
                  className={fieldClass}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
            ) : null}
            <div>
              <label className="text-sm font-medium text-foreground">
                Accent color
              </label>
              <div className="mt-1 flex gap-2">
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="h-10 w-12 cursor-pointer rounded border border-border bg-surface p-1"
                />
                <input
                  className={fieldClass + " mt-0"}
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[14px] border border-border bg-surface p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-foreground">Blocks</h2>
            <p className="text-xs text-muted">Drag the handle to reorder</p>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onDragEnd}
          >
            <SortableContext
              items={blocks.map((b) => b.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="mt-4 space-y-3">
                {blocks.map((block) => (
                  <SortableBlockCard
                    key={block.id}
                    block={block}
                    selected={selectedId === block.id}
                    onSelect={() => setSelectedId(block.id)}
                    onChange={(next) => updateBlock(block.id, next)}
                    onRemove={() => removeBlock(block.id)}
                    onPickImage={(file, field) =>
                      setResizeTarget({ blockId: block.id, file, field })
                    }
                    uploading={uploadingId === block.id}
                    accentColor={accentColor}
                    customFonts={customFonts}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {resizeTarget && (
            <ImageResizeModal
              file={resizeTarget.file}
              onCancel={() => setResizeTarget(null)}
              onConfirm={(file) => {
                const { blockId, field } = resizeTarget;
                setResizeTarget(null);
                void handleUpload(blockId, file, field);
              }}
            />
          )}

          <div className="mt-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
              Add block
            </p>
            <div className="flex flex-wrap gap-2">
              {ADDABLE.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => addBlock(type)}
                  className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface-muted/50 px-2.5 py-1.5 text-xs font-medium text-foreground hover:border-merlot/40 hover:bg-merlot/5"
                >
                  <Plus size={12} />
                  {BLOCK_LABELS[type]}
                </button>
              ))}
            </div>
          </div>

          {message && (
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
          )}

          <div className="mt-5 flex justify-end">
            <Button type="button" disabled={saving} onClick={handleSave}>
              {saving ? "Saving…" : saveLabel}
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-3 xl:sticky xl:top-4 xl:self-start">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Live preview</h2>
            <p className="text-xs text-muted">Updates as you edit — not sent.</p>
          </div>
          <div>
            <label htmlFor="previewName" className="text-xs text-muted">
              Preview name
            </label>
            <input
              id="previewName"
              value={previewName}
              onChange={(e) => setPreviewName(e.target.value)}
              className="mt-1 w-40 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm"
            />
          </div>
        </div>
        {previewVariant === "web" ? (
          <FormThankYouView
            thankYou={{
              accentColor,
              blocks,
              pageBg: null,
            }}
            discountCode={discountCode}
            name={previewName || "Customer"}
            showPageChrome={false}
          />
        ) : (
          <div className="overflow-hidden rounded-[14px] border border-border bg-cream">
            <LeadWelcomeEmail
              name={previewName || "Customer"}
              discountCode={discountCode}
              template={previewTemplate}
              customFonts={customFonts}
              editUrl="https://join.aerisbeaute.com/daftar/edit?token=preview"
            />
          </div>
        )}
      </div>
    </div>
  );
}

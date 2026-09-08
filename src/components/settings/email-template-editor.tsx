"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { arrayMove } from "@dnd-kit/sortable";
import {
  BadgePercent,
  Heading as HeadingIcon,
  Image as ImageIcon,
  Minus,
  MousePointerClick,
  MoveVertical,
  PanelBottom,
  PanelTop,
  Settings2,
  Type,
} from "lucide-react";
import {
  createEmailAssetUploadSlotAction,
  saveLeadWelcomeEmailAction,
} from "@/app/(portal)/marketing/design/email/actions";
import {
  AddPalette,
  EditorShell,
  type EditorDevice,
  type EditorMessage,
} from "@/components/editor/editor-shell";
import { EditorRail, type EditorRailItem } from "@/components/editor/editor-rail";
import { useEditorHistory } from "@/components/editor/use-editor-history";
import {
  useEditorShortcuts,
  useUnsavedChangesGuard,
} from "@/components/editor/use-editor-shortcuts";
import { EmailCanvas } from "@/components/settings/email-canvas";
import {
  EmailInspector,
  type EmailDoc,
} from "@/components/settings/email-inspector";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  BLOCK_LABELS,
  createBlock,
  newBlockId,
  type EmailBlock,
  type EmailBlockType,
} from "@/lib/email-blocks";
import type { EmailCustomFont } from "@/lib/email-fonts";
import type { EmailTemplate } from "@/lib/email-templates";
import { LEAD_DISCOUNT_CODE } from "@/lib/lead-offer";
import { cn } from "@/lib/utils";

const ImageResizeModal = dynamic(
  () =>
    import("@/components/settings/image-resize-modal").then(
      (m) => m.ImageResizeModal,
    ),
  { ssr: false },
);

const PREVIEW_EDIT_URL =
  "https://join.aerisbeaute.com/daftar/edit?token=preview";

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

const BLOCK_ICONS: Record<EmailBlockType, React.ReactNode> = {
  header: <PanelTop size={14} />,
  image: <ImageIcon size={14} />,
  heading: <HeadingIcon size={14} />,
  text: <Type size={14} />,
  discount: <BadgePercent size={14} />,
  button: <MousePointerClick size={14} />,
  spacer: <MoveVertical size={14} />,
  divider: <Minus size={14} />,
  footer: <PanelBottom size={14} />,
};

function blockSummary(block: EmailBlock): string | undefined {
  switch (block.type) {
    case "header":
      return block.brandName || undefined;
    case "image":
      return block.src ? block.alt || "Image" : "No image yet";
    case "heading":
    case "text":
    case "footer":
      return block.text.trim().slice(0, 48) || undefined;
    case "discount":
      return block.label || undefined;
    case "button":
      return block.label || undefined;
    case "spacer":
      return `${block.height}px tall`;
    case "divider":
      return `${block.style?.thickness ?? 1}px line`;
  }
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
  linkedDiscountCode,
  linkedDiscountHref,
  heightClass,
  readOnly = false,
  active = true,
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
  /**
   * When set, the discount block shows this code as read-only with a link to
   * edit it on the QR form (code is not stored on the email template).
   */
  linkedDiscountCode?: string;
  linkedDiscountHref?: string;
  /** Overrides the shell height when embedded inside another page. */
  heightClass?: string;
  readOnly?: boolean;
  /** Set false when the editor is mounted but hidden, so shortcuts stay off. */
  active?: boolean;
}) {
  const history = useEditorHistory<EmailDoc>({
    name: initial.name,
    subject: initial.subject,
    accentColor: initial.accentColor,
    blocks: initial.blocks,
  });
  const { doc, commit, markSaved } = history;

  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [previewName, setPreviewName] = React.useState("Adinda");
  const [device, setDevice] = React.useState<EditorDevice>("desktop");
  const [saving, setSaving] = React.useState(false);
  const [uploadingId, setUploadingId] = React.useState<string | null>(null);
  const [resizeTarget, setResizeTarget] = React.useState<{
    blockId: string;
    file: File;
    field: "src" | "logoUrl";
  } | null>(null);
  const [message, setMessage] = React.useState<EditorMessage>(null);

  useUnsavedChangesGuard(history.isDirty && !readOnly);

  // Keystrokes stay responsive; the canvas repaints in a lower-priority pass.
  const canvasDoc = React.useDeferredValue(doc);

  const selectedBlock = React.useMemo(
    () => doc.blocks.find((b) => b.id === selectedId) ?? null,
    [doc.blocks, selectedId],
  );

  /* ---------- Document mutations ---------- */

  const changeDoc = React.useCallback(
    (patch: Partial<EmailDoc>) => {
      const tag = `doc:${Object.keys(patch).join(",")}`;
      commit((prev) => ({ ...prev, ...patch }), tag);
    },
    [commit],
  );

  const changeBlock = React.useCallback(
    (next: EmailBlock) => {
      commit(
        (prev) => ({
          ...prev,
          blocks: prev.blocks.map((b) => (b.id === next.id ? next : b)),
        }),
        `block:${next.id}`,
      );
    },
    [commit],
  );

  const addBlock = React.useCallback(
    (type: EmailBlockType) => {
      const block = createBlock(type);
      commit((prev) => {
        const at = prev.blocks.findIndex((b) => b.id === selectedId);
        const blocks = [...prev.blocks];
        blocks.splice(at < 0 ? blocks.length : at + 1, 0, block);
        return { ...prev, blocks };
      });
      setSelectedId(block.id);
    },
    [commit, selectedId],
  );

  const duplicateBlock = React.useCallback(
    (id: string) => {
      const copyId = newBlockId();
      commit((prev) => {
        const at = prev.blocks.findIndex((b) => b.id === id);
        if (at < 0) return prev;
        const source = prev.blocks[at]!;
        const blocks = [...prev.blocks];
        blocks.splice(at + 1, 0, { ...source, id: copyId });
        return { ...prev, blocks };
      });
      setSelectedId(copyId);
    },
    [commit],
  );

  const removeBlock = React.useCallback(
    (id: string) => {
      commit((prev) => {
        const at = prev.blocks.findIndex((b) => b.id === id);
        if (at < 0) return prev;
        return { ...prev, blocks: prev.blocks.filter((b) => b.id !== id) };
      });
      setSelectedId((current) => {
        if (current !== id) return current;
        const at = doc.blocks.findIndex((b) => b.id === id);
        const neighbour = doc.blocks[at + 1] ?? doc.blocks[at - 1];
        return neighbour?.id ?? null;
      });
    },
    [commit, doc.blocks],
  );

  const reorder = React.useCallback(
    (from: number, to: number) => {
      commit((prev) => ({ ...prev, blocks: arrayMove(prev.blocks, from, to) }));
    },
    [commit],
  );

  /* ---------- Image upload ---------- */

  const pickImage = React.useCallback(
    (blockId: string, file: File, field: "src" | "logoUrl") => {
      setResizeTarget({ blockId, file, field });
    },
    [],
  );

  const handleUpload = React.useCallback(
    async (blockId: string, file: File, field: "src" | "logoUrl") => {
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
            setMessage({
              ok: false,
              text: error.message || "Upload to storage failed.",
            });
            return;
          }
          if (!publicUrl) {
            publicUrl = supabase.storage
              .from("email-assets")
              .getPublicUrl(slot.path).data.publicUrl;
          }
        }

        commit((prev) => ({
          ...prev,
          blocks: prev.blocks.map((b) => {
            if (b.id !== blockId) return b;
            if (field === "logoUrl" && b.type === "header") {
              return { ...b, logoUrl: publicUrl };
            }
            if (field === "src" && b.type === "image") {
              return { ...b, src: publicUrl };
            }
            return b;
          }),
        }));

        setMessage({
          ok: true,
          text:
            field === "logoUrl"
              ? "Logo uploaded. Remember to save."
              : "Image uploaded. Remember to save.",
        });
      } catch (e) {
        setMessage({
          ok: false,
          text: e instanceof Error ? e.message : "Upload failed unexpectedly.",
        });
      } finally {
        setUploadingId(null);
      }
    },
    [commit],
  );

  /* ---------- Save ---------- */

  const handleSave = React.useCallback(async () => {
    if (readOnly || saving) return;
    setSaving(true);
    setMessage(null);
    try {
      const save =
        onSave ??
        (async (input: EmailSaveInput) =>
          saveLeadWelcomeEmailAction({
            subject: input.subject,
            accentColor: input.accentColor,
            blocks: input.blocks,
            name: input.name,
          }));
      const res = await save({
        id: initial.id,
        name: doc.name,
        subject: doc.subject,
        accentColor: doc.accentColor,
        blocks: doc.blocks,
        description: initial.description,
      });
      setMessage({
        ok: res.ok,
        text: res.ok ? successMessage : (res.error ?? "Save failed."),
      });
      if (res.ok) markSaved();
    } finally {
      setSaving(false);
    }
  }, [
    readOnly,
    saving,
    onSave,
    initial.id,
    initial.description,
    doc,
    successMessage,
    markSaved,
  ]);

  useEditorShortcuts({
    enabled: !readOnly && active,
    onUndo: history.undo,
    onRedo: history.redo,
    onSave: () => void handleSave(),
    onDuplicate: () => {
      if (selectedId) duplicateBlock(selectedId);
    },
    onDelete: () => {
      if (selectedId) removeBlock(selectedId);
    },
  });

  /* ---------- Rail ---------- */

  const railItems = React.useMemo<EditorRailItem[]>(
    () =>
      doc.blocks.map((block) => ({
        id: block.id,
        label: BLOCK_LABELS[block.type],
        sublabel: blockSummary(block),
        icon: BLOCK_ICONS[block.type],
      })),
    [doc.blocks],
  );

  const paletteOptions = React.useMemo(
    () =>
      ADDABLE.map((type) => ({
        id: type,
        label: BLOCK_LABELS[type],
        icon: BLOCK_ICONS[type],
      })),
    [],
  );

  const settingsLabel =
    previewVariant === "web" ? "Landing page settings" : "Email settings";

  const rail = (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setSelectedId(null)}
        className={cn(
          "flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition-colors",
          selectedId === null
            ? "border-merlot/50 bg-merlot/5"
            : "border-transparent hover:border-border hover:bg-surface-muted/60",
        )}
      >
        <Settings2
          size={14}
          className={selectedId === null ? "text-merlot" : "text-muted"}
        />
        <span className="truncate text-[13px] font-medium text-foreground">
          {settingsLabel}
        </span>
      </button>

      <div>
        <p className="mb-1 px-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
          Blocks
        </p>
        <EditorRail
          dndId={`email-blocks-${initial.id}`}
          items={railItems}
          selectedId={selectedId}
          disabled={readOnly}
          onSelect={setSelectedId}
          onReorder={reorder}
          onDuplicate={duplicateBlock}
          onRemove={removeBlock}
        />
      </div>
    </div>
  );

  return (
    <>
      <EditorShell
        heightClass={heightClass}
        railTitle="Content"
        rail={rail}
        railFooter={
          !readOnly ? (
            <AddPalette
              title="Add block"
              options={paletteOptions}
              onAdd={addBlock}
            />
          ) : null
        }
        canvas={
          <EmailCanvas
            blocks={canvasDoc.blocks}
            accentColor={canvasDoc.accentColor}
            variant={previewVariant}
            customFonts={customFonts}
            previewName={previewName}
            discountCode={discountCode}
            editUrl={previewVariant === "email" ? PREVIEW_EDIT_URL : ""}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        }
        inspectorTitle={
          selectedBlock ? BLOCK_LABELS[selectedBlock.type] : settingsLabel
        }
        inspector={
          <EmailInspector
            block={selectedBlock}
            doc={doc}
            variant={previewVariant}
            accentColor={doc.accentColor}
            customFonts={customFonts}
            showNameField={showNameField}
            showSubjectField={showSubjectField}
            uploading={uploadingId === selectedBlock?.id}
            readOnly={readOnly}
            linkedDiscountCode={linkedDiscountCode}
            linkedDiscountHref={linkedDiscountHref}
            onChangeDoc={changeDoc}
            onChangeBlock={changeBlock}
            onPickImage={pickImage}
          />
        }
        device={device}
        onDeviceChange={setDevice}
        canUndo={history.canUndo}
        canRedo={history.canRedo}
        onUndo={history.undo}
        onRedo={history.redo}
        isDirty={history.isDirty}
        saving={saving}
        onSave={() => void handleSave()}
        saveLabel={saveLabel}
        readOnly={readOnly}
        message={message}
        onDismissMessage={() => setMessage(null)}
        toolbarExtra={
          <label className="flex items-center gap-1.5 text-[11px] text-muted">
            Preview name
            <input
              value={previewName}
              onChange={(e) => setPreviewName(e.target.value)}
              className="w-24 rounded-md border border-border bg-surface px-2 py-1 text-[12px] text-foreground outline-none focus:border-merlot focus:ring-2 focus:ring-merlot/20"
            />
          </label>
        }
      />

      {resizeTarget ? (
        <ImageResizeModal
          file={resizeTarget.file}
          onCancel={() => setResizeTarget(null)}
          onConfirm={(file) => {
            const { blockId, field } = resizeTarget;
            setResizeTarget(null);
            void handleUpload(blockId, file, field);
          }}
        />
      ) : null}
    </>
  );
}

"use client";

import * as React from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import {
  ButtonStyleControls,
  DividerStyleControls,
  ImageStyleControls,
  TextStyleControls,
} from "@/components/settings/email-style-controls";
import {
  InspectorEmpty,
  InspectorField,
  InspectorSection,
} from "@/components/editor/editor-shell";
import {
  EditorColorInput,
  EditorSlider,
  EditorToggle,
  editorFieldClass,
} from "@/components/editor/controls";
import type { EmailBlock } from "@/lib/email-blocks";
import type { EmailCustomFont } from "@/lib/email-fonts";
import { cn } from "@/lib/utils";
import type { EmailPreviewVariant } from "./email-canvas";

export type EmailDoc = {
  name: string;
  subject: string;
  accentColor: string;
  blocks: EmailBlock[];
};

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-surface-muted px-1 py-0.5 font-mono text-[10px]">
      {children}
    </code>
  );
}

function UploadButton({
  label,
  uploading,
  disabled,
  onPick,
}: {
  label: string;
  uploading: boolean;
  disabled: boolean;
  onPick: (file: File) => void;
}) {
  return (
    <label
      className={cn(
        "inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5",
        "text-[11px] font-medium text-foreground transition-colors hover:border-merlot/40 hover:bg-merlot/5",
        (disabled || uploading) && "pointer-events-none opacity-60",
      )}
    >
      <ImagePlus size={13} />
      {uploading ? "Uploading…" : label}
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        disabled={disabled || uploading}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onPick(file);
          event.target.value = "";
        }}
      />
    </label>
  );
}

function MarkdownHint({ variant }: { variant: EmailPreviewVariant }) {
  return (
    <p className="text-[11px] leading-relaxed text-muted">
      Markdown: <Chip>[label](https://…)</Chip> <Chip>**bold**</Chip>{" "}
      <Chip>*italic*</Chip>. Placeholder <Chip>{"{name}"}</Chip>
      {variant === "email" ? (
        <>
          {" "}
          and <Chip>{"{edit_url}"}</Chip>
        </>
      ) : null}
      .
    </p>
  );
}

export function EmailInspector({
  block,
  doc,
  variant,
  accentColor,
  customFonts,
  showNameField,
  showSubjectField,
  uploading,
  readOnly,
  onChangeDoc,
  onChangeBlock,
  onPickImage,
}: {
  /** `null` shows template-level settings. */
  block: EmailBlock | null;
  doc: EmailDoc;
  variant: EmailPreviewVariant;
  accentColor: string;
  customFonts: EmailCustomFont[];
  showNameField: boolean;
  showSubjectField: boolean;
  uploading: boolean;
  readOnly: boolean;
  onChangeDoc: (patch: Partial<EmailDoc>) => void;
  onChangeBlock: (next: EmailBlock) => void;
  onPickImage: (blockId: string, file: File, field: "src" | "logoUrl") => void;
}) {
  if (!block) {
    return (
      <>
        <InspectorSection
          title={variant === "web" ? "Landing page" : "Email"}
        >
          {showNameField ? (
            <InspectorField label="Template name">
              <input
                className={editorFieldClass}
                value={doc.name}
                disabled={readOnly}
                placeholder="e.g. Reorder nurture"
                onChange={(e) => onChangeDoc({ name: e.target.value })}
              />
            </InspectorField>
          ) : null}

          {showSubjectField ? (
            <InspectorField label="Subject line">
              <input
                className={editorFieldClass}
                value={doc.subject}
                disabled={readOnly}
                onChange={(e) => onChangeDoc({ subject: e.target.value })}
              />
            </InspectorField>
          ) : null}

          <EditorColorInput
            label="Accent color"
            value={doc.accentColor}
            onChange={(accentColor) => onChangeDoc({ accentColor })}
          />
        </InspectorSection>

        <InspectorSection title="Tips">
          <p className="text-[11px] leading-relaxed text-muted">
            Click any block on the canvas to edit it. Placeholders{" "}
            <Chip>{"{name}"}</Chip>
            {variant === "email" ? (
              <>
                {" "}
                and <Chip>{"{edit_url}"}</Chip>
              </>
            ) : null}{" "}
            are replaced when the message is sent. Text blocks support markdown
            links, bold and italic.
          </p>
        </InspectorSection>
      </>
    );
  }

  if (readOnly) {
    return (
      <InspectorEmpty text="You need marketing edit permission to change this template." />
    );
  }

  switch (block.type) {
    case "header":
      return (
        <>
          <InspectorSection title="Brand header">
            <InspectorField label="Brand name">
              <input
                className={editorFieldClass}
                value={block.brandName}
                placeholder="Brand name"
                onChange={(e) =>
                  onChangeBlock({ ...block, brandName: e.target.value })
                }
              />
            </InspectorField>

            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
                Brand logo
              </p>
              {block.logoUrl ? (
                <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-border bg-surface-muted/40 p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={block.logoUrl}
                    alt="Brand logo"
                    className="max-h-10 max-w-[120px] object-contain"
                  />
                  <button
                    type="button"
                    aria-label="Remove logo"
                    title="Remove logo"
                    className="ml-auto rounded p-1 text-muted hover:bg-danger/10 hover:text-danger"
                    onClick={() => onChangeBlock({ ...block, logoUrl: "" })}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ) : (
                <p className="mt-1 text-[11px] leading-relaxed text-muted">
                  No logo yet — the letter mark is used instead, if enabled.
                </p>
              )}
              <div className="mt-1.5">
                <UploadButton
                  label="Upload logo"
                  uploading={uploading}
                  disabled={false}
                  onPick={(file) => onPickImage(block.id, file, "logoUrl")}
                />
              </div>
              <input
                className={editorFieldClass}
                value={block.logoUrl ?? ""}
                placeholder="Or paste logo URL"
                onChange={(e) =>
                  onChangeBlock({ ...block, logoUrl: e.target.value })
                }
              />
            </div>

            <EditorToggle
              label="Show “A” mark"
              checked={block.showMark}
              disabled={Boolean(block.logoUrl?.trim())}
              hint={
                block.logoUrl?.trim() ? "Hidden while a logo is set" : undefined
              }
              onChange={(showMark) => onChangeBlock({ ...block, showMark })}
            />
          </InspectorSection>

          <InspectorSection>
            <TextStyleControls
              style={block.style}
              onChange={(style) => onChangeBlock({ ...block, style })}
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
          </InspectorSection>
        </>
      );

    case "image":
      return (
        <>
          <InspectorSection title="Image">
            {block.src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={block.src}
                alt={block.alt}
                className="max-h-24 w-full rounded-lg border border-border object-cover"
              />
            ) : (
              <div className="flex h-16 items-center justify-center rounded-lg border border-dashed border-border bg-surface-muted text-[11px] text-muted">
                No image yet
              </div>
            )}

            <UploadButton
              label="Upload & resize"
              uploading={uploading}
              disabled={false}
              onPick={(file) => onPickImage(block.id, file, "src")}
            />

            <InspectorField label="Image URL">
              <input
                className={editorFieldClass}
                value={block.src}
                placeholder="Or paste image URL"
                onChange={(e) =>
                  onChangeBlock({ ...block, src: e.target.value })
                }
              />
            </InspectorField>

            <InspectorField label="Click-through link">
              <input
                className={editorFieldClass}
                value={block.href ?? ""}
                placeholder="https://…"
                onChange={(e) =>
                  onChangeBlock({ ...block, href: e.target.value })
                }
              />
            </InspectorField>

            <InspectorField label="Alt text">
              <input
                className={editorFieldClass}
                value={block.alt}
                placeholder="Describe the image"
                onChange={(e) =>
                  onChangeBlock({ ...block, alt: e.target.value })
                }
              />
            </InspectorField>
          </InspectorSection>

          <InspectorSection>
            <ImageStyleControls
              style={block.style}
              onChange={(style) => onChangeBlock({ ...block, style })}
            />
          </InspectorSection>
        </>
      );

    case "heading":
    case "text":
    case "footer":
      return (
        <>
          <InspectorSection
            title={
              block.type === "heading"
                ? "Heading"
                : block.type === "footer"
                  ? "Footer"
                  : "Text"
            }
          >
            <textarea
              className={cn(editorFieldClass, "resize-y leading-relaxed")}
              rows={block.type === "heading" ? 3 : 6}
              value={block.text}
              placeholder={
                block.type === "heading"
                  ? "Hello, {name}"
                  : "Visit [our shop](https://aerisbeaute.com) — use {name} for first name"
              }
              onChange={(e) =>
                onChangeBlock({ ...block, text: e.target.value })
              }
            />
            <MarkdownHint variant={variant} />
          </InspectorSection>

          <InspectorSection>
            <TextStyleControls
              style={block.style}
              onChange={(style) => onChangeBlock({ ...block, style })}
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
          </InspectorSection>
        </>
      );

    case "discount":
      return (
        <>
          <InspectorSection title="Discount code">
            <InspectorField
              label="Label"
              hint="The code itself comes from the campaign or form template."
            >
              <input
                className={editorFieldClass}
                value={block.label}
                placeholder="Discount label"
                onChange={(e) =>
                  onChangeBlock({ ...block, label: e.target.value })
                }
              />
            </InspectorField>
          </InspectorSection>

          <InspectorSection>
            <TextStyleControls
              style={block.style}
              onChange={(style) => onChangeBlock({ ...block, style })}
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
          </InspectorSection>
        </>
      );

    case "button":
      return (
        <>
          <InspectorSection title="Button">
            <InspectorField label="Label">
              <input
                className={editorFieldClass}
                value={block.label}
                placeholder="Button label"
                onChange={(e) =>
                  onChangeBlock({ ...block, label: e.target.value })
                }
              />
            </InspectorField>
            <InspectorField label="Link">
              <input
                className={editorFieldClass}
                value={block.href}
                placeholder="https://"
                onChange={(e) =>
                  onChangeBlock({ ...block, href: e.target.value })
                }
              />
            </InspectorField>
          </InspectorSection>

          <InspectorSection>
            <ButtonStyleControls
              style={block.style}
              onChange={(style) => onChangeBlock({ ...block, style })}
              accentFallback={accentColor}
              customFonts={customFonts}
            />
          </InspectorSection>
        </>
      );

    case "spacer":
      return (
        <InspectorSection title="Spacer">
          <EditorSlider
            label="Height"
            min={8}
            max={200}
            value={Math.min(Math.max(block.height, 8), 200)}
            onChange={(height) => onChangeBlock({ ...block, height })}
          />
          <InspectorField label="Exact height (px)">
            <input
              type="number"
              min={1}
              className={editorFieldClass}
              value={block.height}
              onChange={(e) =>
                onChangeBlock({
                  ...block,
                  height: Number(e.target.value) || 24,
                })
              }
            />
          </InspectorField>
        </InspectorSection>
      );

    case "divider":
      return (
        <InspectorSection title="Divider">
          <DividerStyleControls
            style={block.style}
            onChange={(style) => onChangeBlock({ ...block, style })}
          />
        </InspectorSection>
      );

    default:
      return <InspectorEmpty text="Select a block to edit it." />;
  }
}

"use client";

import * as React from "react";
import {
  EmailBlockView,
  EmailFrame,
  type EmailBlockContext,
} from "@/emails/lead-welcome";
import {
  ThankYouBlockView,
  ThankYouFrame,
  type ThankYouBlockContext,
} from "@/components/leads/form-thank-you-view";
import { CanvasSelectable } from "@/components/editor/canvas-selectable";
import { BLOCK_LABELS, type EmailBlock } from "@/lib/email-blocks";
import type { EmailCustomFont } from "@/lib/email-fonts";
import type { TemplateVars } from "@/lib/email-templates";

export type EmailPreviewVariant = "email" | "web";

/**
 * Mirrors the `return null` guards in the two block renderers so empty blocks
 * still get a selectable placeholder on the canvas.
 */
function isBlockEmpty(block: EmailBlock, variant: EmailPreviewVariant): boolean {
  switch (block.type) {
    case "image":
      return !block.src?.trim();
    case "text":
      return !block.text.trim();
    case "heading":
    case "footer":
      return variant === "web" && !block.text.trim();
    case "header":
      return (
        variant === "web" &&
        !block.logoUrl?.trim() &&
        !block.showMark &&
        !block.brandName?.trim()
      );
    default:
      return false;
  }
}

const SelectableBlock = React.memo(function SelectableBlock({
  block,
  variant,
  emailCtx,
  webCtx,
  selected,
  onSelect,
}: {
  block: EmailBlock;
  variant: EmailPreviewVariant;
  emailCtx: EmailBlockContext;
  webCtx: ThankYouBlockContext;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const label = BLOCK_LABELS[block.type];

  return (
    <CanvasSelectable
      id={block.id}
      label={label}
      selected={selected}
      onSelect={onSelect}
    >
      {isBlockEmpty(block, variant) ? (
        <div className="rounded-lg border border-dashed border-merlot/30 bg-merlot/[0.03] px-3 py-5 text-center text-[11px] font-medium text-muted">
          Empty {label.toLowerCase()}
        </div>
      ) : variant === "web" ? (
        <ThankYouBlockView block={block} ctx={webCtx} />
      ) : (
        <EmailBlockView block={block} ctx={emailCtx} />
      )}
    </CanvasSelectable>
  );
});

export const EmailCanvas = React.memo(function EmailCanvas({
  blocks,
  accentColor,
  variant,
  customFonts,
  previewName,
  discountCode,
  editUrl,
  selectedId,
  onSelect,
}: {
  blocks: EmailBlock[];
  accentColor: string;
  variant: EmailPreviewVariant;
  customFonts: EmailCustomFont[];
  previewName: string;
  discountCode: string;
  editUrl: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const accent = accentColor || "#6f2c3f";

  const vars = React.useMemo<TemplateVars>(
    () => ({ name: previewName || "Customer", editUrl }),
    [previewName, editUrl],
  );

  const emailCtx = React.useMemo<EmailBlockContext>(
    () => ({ vars, discountCode, accent, customFonts }),
    [vars, discountCode, accent, customFonts],
  );

  const webCtx = React.useMemo<ThankYouBlockContext>(
    () => ({ vars, discountCode, accent }),
    [vars, discountCode, accent],
  );

  const children = blocks.map((block) => (
    <SelectableBlock
      key={block.id}
      block={block}
      variant={variant}
      emailCtx={emailCtx}
      webCtx={webCtx}
      selected={selectedId === block.id}
      onSelect={onSelect}
    />
  ));

  if (blocks.length === 0) {
    return (
      <div className="rounded-[14px] border border-dashed border-border bg-surface p-10 text-center">
        <p className="text-sm font-medium text-foreground">No blocks yet</p>
        <p className="mt-1 text-xs text-muted">
          Add one from the panel on the left to start designing.
        </p>
      </div>
    );
  }

  if (variant === "web") {
    return <ThankYouFrame>{children}</ThankYouFrame>;
  }

  return (
    <div className="rounded-[14px] border border-border shadow-[0_8px_28px_rgba(45,43,42,0.10)]">
      <EmailFrame customFonts={customFonts} clip={false}>
        {children}
      </EmailFrame>
    </div>
  );
});

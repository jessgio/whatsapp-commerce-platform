"use client";

import * as React from "react";
import Image from "next/image";
import type { EmailBlock } from "@/lib/email-blocks";
import { renderEmailMarkdown } from "@/lib/email-markdown";
import {
  applyTemplateVars,
  type TemplateVars,
} from "@/lib/email-templates";
import {
  clampFontSize,
  EMAIL_BRAND_DEFAULT,
  EMAIL_CREAM_DEFAULT,
  isHexColor,
  resolveFontFamily,
  resolveHexColor,
  textStyleToCss,
} from "@/lib/email-style";
import type { FormThankYou } from "@/lib/form-templates";

const base = {
  cream: "#f6f1e9",
  surface: "#ffffff",
  charcoal: "#2d2b2a",
  muted: "#8a7e72",
  border: "#e6dccb",
};

function renderBlock(
  block: EmailBlock,
  ctx: { vars: TemplateVars; discountCode: string; accent: string },
) {
  const { vars, discountCode, accent } = ctx;

  switch (block.type) {
    case "header": {
      const logoUrl = block.logoUrl?.trim();
      const showLogo = Boolean(logoUrl);
      const showLetterMark = !showLogo && block.showMark;
      const showBrandName = Boolean(block.brandName?.trim());
      const brandCss = textStyleToCss(block.style, {
        fontFamily: "sans",
        fontSize: 18,
        fontWeight: 600,
        align: "center",
        color: base.charcoal,
      });
      if (!showLogo && !showLetterMark && !showBrandName) return null;
      const markBg = resolveHexColor(
        block.style?.backgroundColor,
        EMAIL_BRAND_DEFAULT,
      );
      const headerBg = isHexColor(block.style?.backgroundColor)
        ? block.style!.backgroundColor!.trim()
        : undefined;
      return (
        <div
          key={block.id}
          className="mb-5 flex flex-col items-center gap-2 px-1"
          style={{
            textAlign: brandCss.textAlign,
            ...(headerBg
              ? {
                  backgroundColor: headerBg,
                  borderRadius: 12,
                  padding: "20px 16px",
                }
              : {}),
          }}
        >
          {showLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl!}
              alt={block.brandName || "Brand"}
              className="h-auto w-28 object-contain"
            />
          ) : null}
          {showLetterMark ? (
            <span
              className="inline-flex size-10 items-center justify-center rounded-full text-sm font-semibold text-white"
              style={{ backgroundColor: markBg }}
            >
              A
            </span>
          ) : null}
          {showBrandName ? (
            <p className="m-0" style={brandCss}>
              {block.brandName}
            </p>
          ) : null}
        </div>
      );
    }

    case "image": {
      if (!block.src?.trim()) return null;
      const width = Math.min(
        100,
        Math.max(20, Math.round(block.style?.widthPercent ?? 100)),
      );
      const radius = Math.min(
        28,
        Math.max(0, Math.round(block.style?.borderRadius ?? 0)),
      );
      const align = block.style?.align ?? "center";
      const img = (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={block.src}
          alt={block.alt || ""}
          className="h-auto object-cover"
          style={{
            width: `${width}%`,
            maxWidth: "100%",
            borderRadius: radius,
            display: "block",
            margin:
              align === "left"
                ? "0 auto 0 0"
                : align === "right"
                  ? "0 0 0 auto"
                  : "0 auto",
          }}
        />
      );
      return (
        <div key={block.id} className="mb-6 overflow-hidden rounded-xl">
          {block.href?.trim() ? (
            <a
              href={applyTemplateVars(block.href, vars)}
              target="_blank"
              rel="noopener noreferrer"
            >
              {img}
            </a>
          ) : (
            img
          )}
        </div>
      );
    }

    case "heading": {
      if (!block.text.trim()) return null;
      const css = textStyleToCss(block.style, {
        fontFamily: "sans",
        fontSize: 24,
        fontWeight: 600,
        align: "center",
        color: base.charcoal,
        lineHeight: 1.3,
      });
      return (
        <h1 key={block.id} className="mb-3 mt-0" style={css}>
          {renderEmailMarkdown(block.text, vars, accent)}
        </h1>
      );
    }

    case "text": {
      if (!block.text.trim()) return null;
      const css = textStyleToCss(block.style, {
        fontFamily: "sans",
        fontSize: 14,
        fontWeight: 400,
        align: "center",
        color: base.muted,
        lineHeight: 1.6,
      });
      return (
        <div key={block.id} className="mb-3 whitespace-pre-wrap" style={css}>
          {renderEmailMarkdown(block.text, vars, accent)}
        </div>
      );
    }

    case "discount": {
      const align = block.style?.align ?? "center";
      const labelCss = textStyleToCss(block.style, {
        fontFamily: "sans",
        fontSize: 11,
        fontWeight: 500,
        align,
        color: base.muted,
        letterSpacing: 0.12,
      });
      const borderColor = resolveHexColor(
        block.style?.borderColor,
        EMAIL_BRAND_DEFAULT,
      );
      const cardBg = resolveHexColor(
        block.style?.backgroundColor,
        EMAIL_CREAM_DEFAULT,
      );
      const codeColor = resolveHexColor(
        block.style?.codeColor,
        EMAIL_BRAND_DEFAULT,
      );
      return (
        <a
          key={block.id}
          href="https://shopee.co.id/aerisbeaute"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 mb-2 block rounded-xl border border-dashed px-4 py-6 transition-colors hover:opacity-95"
          style={{
            borderColor,
            backgroundColor: cardBg,
            textAlign: align,
          }}
        >
          <p
            className="m-0 uppercase tracking-wide"
            style={{
              ...labelCss,
              fontSize: clampFontSize(block.style?.fontSize, 12),
            }}
          >
            {block.label}
          </p>
          <p
            className="mt-2 font-mono text-3xl font-semibold tracking-[0.18em]"
            style={{
              color: codeColor,
              fontFamily: resolveFontFamily("mono", "mono"),
              textAlign: align,
              margin: "8px 0 0",
            }}
          >
            {discountCode}
          </p>
        </a>
      );
    }

    case "button": {
      const href = applyTemplateVars(block.href, vars);
      const align = block.style?.align ?? "center";
      const bg = isHexColor(block.style?.backgroundColor)
        ? block.style!.backgroundColor!.trim()
        : accent;
      const radius = Math.min(
        28,
        Math.max(0, Math.round(block.style?.borderRadius ?? 10)),
      );
      const padY = Math.min(
        24,
        Math.max(8, Math.round(block.style?.paddingY ?? 12)),
      );
      const padX = Math.min(
        48,
        Math.max(12, Math.round(block.style?.paddingX ?? 22)),
      );
      const textCss = textStyleToCss(block.style, {
        fontFamily: "sans",
        fontSize: 14,
        fontWeight: 600,
        align: "center",
        color: "#fbf6ee",
      });
      const fullWidth = Boolean(block.style?.fullWidth);
      return (
        <div key={block.id} className="my-4" style={{ textAlign: align }}>
          <a
            href={href || "#"}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: fullWidth ? "block" : "inline-block",
              width: fullWidth ? "100%" : undefined,
              boxSizing: "border-box",
              backgroundColor: bg,
              color: textCss.color,
              textDecoration: "none",
              fontFamily: textCss.fontFamily,
              fontSize: textCss.fontSize,
              fontWeight: textCss.fontWeight,
              padding: `${padY}px ${padX}px`,
              borderRadius: radius,
              textAlign: "center",
            }}
          >
            {applyTemplateVars(block.label, vars)}
          </a>
        </div>
      );
    }

    case "spacer":
      return (
        <div
          key={block.id}
          style={{ height: Math.min(160, Math.max(8, block.height)) }}
        />
      );

    case "divider": {
      const thickness = Math.min(
        8,
        Math.max(1, Math.round(block.style?.thickness ?? 1)),
      );
      const inset = Math.min(
        64,
        Math.max(0, Math.round(block.style?.inset ?? 0)),
      );
      const color = isHexColor(block.style?.color)
        ? block.style!.color!.trim()
        : base.border;
      return (
        <div key={block.id} style={{ padding: `8px ${inset}px` }}>
          <hr
            style={{
              border: 0,
              borderTop: `${thickness}px solid ${color}`,
              margin: 0,
            }}
          />
        </div>
      );
    }

    case "footer": {
      if (!block.text.trim()) return null;
      const css = textStyleToCss(block.style, {
        fontFamily: "sans",
        fontSize: 12,
        fontWeight: 400,
        align: "center",
        color: base.muted,
        lineHeight: 1.5,
      });
      return (
        <p key={block.id} className="mt-4 italic" style={css}>
          {renderEmailMarkdown(block.text, vars, accent)}
        </p>
      );
    }

    default:
      return null;
  }
}

export type ThankYouBlockContext = {
  vars: TemplateVars;
  discountCode: string;
  accent: string;
};

/**
 * Single block, memoized for the editor canvas. The public page keeps calling
 * `renderBlock` directly, so its markup is unaffected by this wrapper.
 */
export const ThankYouBlockView = React.memo(function ThankYouBlockView({
  block,
  ctx,
}: {
  block: EmailBlock;
  ctx: ThankYouBlockContext;
}) {
  return <>{renderBlock(block, ctx)}</>;
});

/** Dark backdrop plus the white landing card. Shared with the editor canvas. */
export function ThankYouFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-[14px] bg-[#2a1a14] p-4">
      <div className="pointer-events-none absolute inset-0 bg-black/20" />
      <div className="relative">
        <div className="w-full overflow-visible rounded-[20px] border border-border bg-surface p-6 text-center shadow-[0_16px_48px_rgba(0,0,0,0.35)]">
          {children}
        </div>
      </div>
    </div>
  );
}

export function FormThankYouView({
  thankYou,
  discountCode,
  name = "",
  showPageChrome = true,
}: {
  thankYou: FormThankYou;
  discountCode: string;
  name?: string;
  /** Full-bleed leather background (public page). Off in portal preview card. */
  showPageChrome?: boolean;
}) {
  const accent = thankYou.accentColor || "#6f2c3f";
  const vars: TemplateVars = { name, editUrl: "" };
  const ctx = { vars, discountCode, accent };
  const card = (
    <div className="w-full rounded-[20px] border border-border bg-surface p-8 text-center shadow-[0_16px_48px_rgba(0,0,0,0.35)]">
      {thankYou.blocks.map((block) => renderBlock(block, ctx))}
    </div>
  );

  if (!showPageChrome) {
    return (
      <div className="relative overflow-hidden rounded-[14px] bg-[#2a1a14] p-4">
        <div className="pointer-events-none absolute inset-0 bg-black/20" />
        <div className="relative">{card}</div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#2a1a14]">
      <Image
        src="/images/leather-bg.png"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
        aria-hidden
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-black/20"
      />
      <div className="relative mx-auto flex min-h-screen w-full max-w-lg flex-col items-center justify-center px-4 py-10">
        <div className="animate-fade-in w-full">{card}</div>
      </div>
    </div>
  );
}

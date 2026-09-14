/**
 * Renders the lead welcome / campaign email from designer blocks.
 */
import * as React from "react";
import type { EmailBlock } from "@/lib/email-blocks";
import { buildFontFaceCss, type EmailCustomFont } from "@/lib/email-fonts";
import { renderEmailMarkdown } from "@/lib/email-markdown";
import {
  applyTemplateVars,
  type EmailTemplate,
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

export type LeadWelcomeEmailProps = {
  name: string;
  discountCode: string;
  template: EmailTemplate;
  editUrl?: string;
  /** Uploaded brand fonts — injected as @font-face where clients allow. */
  customFonts?: EmailCustomFont[];
};

const base = {
  cream: "#f6f1e9",
  surface: "#ffffff",
  charcoal: "#2d2b2a",
  muted: "#8a7e72",
  border: "#e6dccb",
};

function renderBlock(
  block: EmailBlock,
  ctx: {
    vars: TemplateVars;
    discountCode: string;
    accent: string;
    customFonts: EmailCustomFont[];
  },
) {
  const { vars, discountCode, accent, customFonts } = ctx;

  switch (block.type) {
    case "header": {
      const logoUrl = block.logoUrl?.trim();
      const showLogo = Boolean(logoUrl);
      const showLetterMark = !showLogo && block.showMark;
      const showBrandName = Boolean(block.brandName?.trim());
      const brandCss = textStyleToCss(
        block.style,
        {
          fontFamily: "sans",
          fontSize: 18,
          fontWeight: 600,
          align: "center",
          color: "#fbf6ee",
          letterSpacing: 0.02,
        },
        customFonts,
      );
      const align = brandCss.textAlign ?? "center";
      const headerBg = resolveHexColor(
        block.style?.backgroundColor,
        EMAIL_BRAND_DEFAULT,
      );
      return (
        <div
          key={block.id}
          style={{
            backgroundColor: headerBg,
            padding: "28px 32px",
            textAlign: align,
          }}
        >
          {showLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={block.brandName || "Logo"}
              width={160}
              style={{
                display: "block",
                margin:
                  align === "left"
                    ? "0 auto 0 0"
                    : align === "right"
                      ? "0 0 0 auto"
                      : "0 auto",
                maxWidth: 160,
                maxHeight: 72,
                width: "auto",
                height: "auto",
                objectFit: "contain" as const,
                border: 0,
              }}
            />
          ) : null}
          {showLetterMark ? (
            <div
              style={{
                display: "inline-block",
                width: 40,
                height: 40,
                lineHeight: "40px",
                borderRadius: 10,
                backgroundColor: "rgba(255,255,255,0.15)",
                color: "#fbf6ee",
                fontFamily: resolveFontFamily(
                  block.style?.fontFamily,
                  "sans",
                  customFonts,
                ),
                fontWeight: 700,
                fontSize: 18,
              }}
            >
              A
            </div>
          ) : null}
          {showBrandName ? (
            <p
              style={{
                margin: showLogo || showLetterMark ? "12px 0 0" : 0,
                ...brandCss,
              }}
            >
              {block.brandName}
            </p>
          ) : null}
        </div>
      );
    }

    case "image": {
      if (!block.src) return null;
      const widthPercent = Math.min(
        100,
        Math.max(40, Math.round(block.style?.widthPercent ?? 100)),
      );
      const radius = Math.min(24, Math.max(0, block.style?.borderRadius ?? 0));
      const align = block.style?.align ?? "center";
      const img = (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={block.src}
          alt={block.alt || ""}
          width={520}
          style={{
            display: "block",
            width: `${widthPercent}%`,
            maxWidth: "100%",
            height: "auto",
            maxHeight: 320,
            objectFit: "cover" as const,
            border: 0,
            borderRadius: radius,
            margin:
              align === "left"
                ? "0 auto 0 0"
                : align === "right"
                  ? "0 0 0 auto"
                  : "0 auto",
          }}
        />
      );
      const href = applyTemplateVars(block.href?.trim() ?? "", vars);
      const wrapStyle: React.CSSProperties = {
        padding: "0",
        textAlign: align,
      };
      if (href && /^https?:\/\//i.test(href)) {
        return (
          <div key={block.id} style={wrapStyle}>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: "inline-block", textDecoration: "none" }}
            >
              {img}
            </a>
          </div>
        );
      }
      return (
        <div key={block.id} style={wrapStyle}>
          {img}
        </div>
      );
    }

    case "heading": {
      const css = textStyleToCss(
        block.style,
        {
          fontFamily: "serif",
          fontSize: 24,
          fontWeight: 600,
          align: "left",
          color: base.charcoal,
          lineHeight: 1.3,
        },
        customFonts,
      );
      return (
        <h1
          key={block.id}
          style={{
            margin: "0 0 12px",
            padding: "28px 32px 0",
            ...css,
          }}
        >
          {renderEmailMarkdown(block.text, vars, accent)}
        </h1>
      );
    }

    case "text": {
      if (!block.text.trim()) return null;
      const css = textStyleToCss(
        block.style,
        {
          fontFamily: "sans",
          fontSize: 16,
          fontWeight: 400,
          align: "left",
          color: base.muted,
          lineHeight: 1.6,
        },
        customFonts,
      );
      return (
        <p
          key={block.id}
          style={{
            margin: "0 0 16px",
            padding: "0 32px",
            ...css,
          }}
        >
          {renderEmailMarkdown(block.text, vars, accent)}
        </p>
      );
    }

    case "discount": {
      const align = block.style?.align ?? "center";
      const labelCss = textStyleToCss(
        block.style,
        {
          fontFamily: "sans",
          fontSize: 11,
          fontWeight: 400,
          align,
          color: base.muted,
          letterSpacing: 0.12,
        },
        customFonts,
      );
      const cardBg = resolveHexColor(
        block.style?.backgroundColor,
        EMAIL_CREAM_DEFAULT,
      );
      const borderColor = resolveHexColor(
        block.style?.borderColor,
        EMAIL_BRAND_DEFAULT,
      );
      const codeColor = resolveHexColor(
        block.style?.codeColor,
        EMAIL_BRAND_DEFAULT,
      );
      return (
        <div key={block.id} style={{ padding: "8px 32px 16px" }}>
          <div
            style={{
              border: `1px dashed ${borderColor}`,
              backgroundColor: cardBg,
              borderRadius: 12,
              padding: "20px 16px",
              textAlign: align,
            }}
          >
            <p
              style={{
                margin: 0,
                textTransform: "uppercase" as const,
                ...labelCss,
                fontSize: clampFontSize(block.style?.fontSize, 11),
              }}
            >
              {block.label}
            </p>
            <p
              style={{
                margin: "10px 0 0",
                fontSize: 28,
                fontWeight: 700,
                letterSpacing: "0.18em",
                color: codeColor,
                fontFamily: resolveFontFamily("mono", "mono", customFonts),
                textAlign: align,
              }}
            >
              {discountCode}
            </p>
          </div>
        </div>
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
      const textCss = textStyleToCss(
        block.style,
        {
          fontFamily: "sans",
          fontSize: 14,
          fontWeight: 600,
          align: "center",
          color: "#fbf6ee",
        },
        customFonts,
      );
      const fullWidth = Boolean(block.style?.fullWidth);
      return (
        <div
          key={block.id}
          style={{ padding: "8px 32px 20px", textAlign: align }}
        >
          <a
            href={href || "#"}
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
        Math.max(0, Math.round(block.style?.inset ?? 32)),
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
      const css = textStyleToCss(
        block.style,
        {
          fontFamily: "sans",
          fontSize: 12,
          fontWeight: 400,
          align: "center",
          color: base.muted,
          lineHeight: 1.5,
        },
        customFonts,
      );
      return (
        <div
          key={block.id}
          style={{
            padding: "16px 32px 24px",
            borderTop: `1px solid ${base.border}`,
            textAlign: css.textAlign,
          }}
        >
          <p style={{ margin: 0, ...css }}>
            {renderEmailMarkdown(block.text, vars, accent)}
          </p>
        </div>
      );
    }

    default:
      return null;
  }
}

export type EmailBlockContext = {
  vars: TemplateVars;
  discountCode: string;
  accent: string;
  customFonts: EmailCustomFont[];
};

/**
 * Single block, memoized for the editor canvas. Only the block being edited
 * re-renders. The send path calls `renderBlock` directly, so email HTML is
 * unaffected by this wrapper.
 */
export const EmailBlockView = React.memo(function EmailBlockView({
  block,
  ctx,
}: {
  block: EmailBlock;
  ctx: EmailBlockContext;
}) {
  return <>{renderBlock(block, ctx)}</>;
});

/** Cream page padding plus the white email card. Shared with the editor canvas. */
export function EmailFrame({
  customFonts = [],
  clip = true,
  children,
}: {
  customFonts?: EmailCustomFont[];
  /** Sent mail clips to the card radius. Editor leaves overflow visible so
   *  the shared selection ring can stay rounded. */
  clip?: boolean;
  children: React.ReactNode;
}) {
  const fontFaceCss = buildFontFaceCss(customFonts);
  return (
    <div
      style={{
        backgroundColor: base.cream,
        fontFamily: resolveFontFamily("serif", "serif", customFonts),
        color: base.charcoal,
        padding: "32px 16px",
      }}
    >
      {fontFaceCss ? <style dangerouslySetInnerHTML={{ __html: fontFaceCss }} /> : null}
      <div
        style={{
          maxWidth: 520,
          margin: "0 auto",
          backgroundColor: base.surface,
          borderRadius: 16,
          border: `1px solid ${base.border}`,
          overflow: clip ? "hidden" : "visible",
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function LeadWelcomeEmail({
  name,
  discountCode,
  template,
  editUrl = "",
  customFonts = [],
}: LeadWelcomeEmailProps) {
  const accent = template.accentColor || "#6f2c3f";
  const vars: TemplateVars = { name, editUrl };
  const ctx = { vars, discountCode, accent, customFonts };

  return (
    <EmailFrame customFonts={customFonts}>
      {template.blocks.map((block) => renderBlock(block, ctx))}
    </EmailFrame>
  );
}

export default LeadWelcomeEmail;

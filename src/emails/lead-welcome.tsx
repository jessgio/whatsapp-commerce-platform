/**
 * Renders the lead welcome email from designer blocks.
 */
import * as React from "react";
import type { EmailBlock } from "@/lib/email-blocks";
import { renderEmailMarkdown } from "@/lib/email-markdown";
import {
  applyTemplateVars,
  type EmailTemplate,
  type TemplateVars,
} from "@/lib/email-templates";

export type LeadWelcomeEmailProps = {
  name: string;
  discountCode: string;
  template: EmailTemplate;
  editUrl?: string;
};

const base = {
  cream: "#f6f1e9",
  surface: "#ffffff",
  charcoal: "#2d2b2a",
  muted: "#8a7e72",
  border: "#e6dccb",
};

const sans =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

function renderBlock(
  block: EmailBlock,
  ctx: {
    vars: TemplateVars;
    discountCode: string;
    accent: string;
  },
) {
  const { vars, discountCode, accent } = ctx;

  switch (block.type) {
    case "header":
      return (
        <div
          key={block.id}
          style={{
            backgroundColor: accent,
            padding: "28px 32px",
            textAlign: "center" as const,
          }}
        >
          {block.showMark ? (
            <div
              style={{
                display: "inline-block",
                width: 40,
                height: 40,
                lineHeight: "40px",
                borderRadius: 10,
                backgroundColor: "rgba(255,255,255,0.15)",
                color: "#fbf6ee",
                fontFamily: sans,
                fontWeight: 700,
                fontSize: 18,
              }}
            >
              A
            </div>
          ) : null}
          <p
            style={{
              margin: block.showMark ? "12px 0 0" : 0,
              color: "#fbf6ee",
              fontSize: 18,
              fontWeight: 600,
              letterSpacing: "0.02em",
            }}
          >
            {block.brandName}
          </p>
        </div>
      );

    case "image": {
      if (!block.src) return null;
      const img = (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={block.src}
          alt={block.alt || ""}
          width={520}
          style={{
            display: "block",
            width: "100%",
            maxHeight: 280,
            objectFit: "cover" as const,
            border: 0,
          }}
        />
      );
      const href = applyTemplateVars(block.href?.trim() ?? "", vars);
      if (href && /^https?:\/\//i.test(href)) {
        return (
          <a
            key={block.id}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "block", textDecoration: "none" }}
          >
            {img}
          </a>
        );
      }
      return <React.Fragment key={block.id}>{img}</React.Fragment>;
    }

    case "heading":
      return (
        <h1
          key={block.id}
          style={{
            margin: "0 0 12px",
            padding: "28px 32px 0",
            fontSize: 24,
            fontWeight: 600,
            lineHeight: 1.3,
            color: base.charcoal,
            fontFamily: 'Georgia, "Times New Roman", Times, serif',
          }}
        >
          {renderEmailMarkdown(block.text, vars, accent)}
        </h1>
      );

    case "text":
      if (!block.text.trim()) return null;
      return (
        <p
          key={block.id}
          style={{
            margin: "0 0 16px",
            padding: "0 32px",
            fontSize: 16,
            lineHeight: 1.6,
            color: base.muted,
            fontFamily: sans,
          }}
        >
          {renderEmailMarkdown(block.text, vars, accent)}
        </p>
      );

    case "discount":
      return (
        <div key={block.id} style={{ padding: "8px 32px 16px" }}>
          <div
            style={{
              border: `1px dashed ${accent}`,
              backgroundColor: "#fbf6ee",
              borderRadius: 12,
              padding: "20px 16px",
              textAlign: "center" as const,
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 11,
                letterSpacing: "0.12em",
                textTransform: "uppercase" as const,
                color: base.muted,
                fontFamily: sans,
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
                color: accent,
                fontFamily:
                  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
              }}
            >
              {discountCode}
            </p>
          </div>
        </div>
      );

    case "button": {
      const href = applyTemplateVars(block.href, vars);
      return (
        <div
          key={block.id}
          style={{ padding: "8px 32px 20px", textAlign: "center" as const }}
        >
          <a
            href={href || "#"}
            style={{
              display: "inline-block",
              backgroundColor: accent,
              color: "#fbf6ee",
              textDecoration: "none",
              fontFamily: sans,
              fontSize: 14,
              fontWeight: 600,
              padding: "12px 22px",
              borderRadius: 10,
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
          style={{ height: Math.min(120, Math.max(8, block.height)) }}
        />
      );

    case "divider":
      return (
        <div key={block.id} style={{ padding: "8px 32px" }}>
          <hr
            style={{
              border: 0,
              borderTop: `1px solid ${base.border}`,
              margin: 0,
            }}
          />
        </div>
      );

    case "footer":
      return (
        <div
          key={block.id}
          style={{
            padding: "16px 32px 24px",
            borderTop: `1px solid ${base.border}`,
            textAlign: "center" as const,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 12,
              color: base.muted,
              fontFamily: sans,
            }}
          >
            {renderEmailMarkdown(block.text, vars, accent)}
          </p>
        </div>
      );

    default:
      return null;
  }
}

export function LeadWelcomeEmail({
  name,
  discountCode,
  template,
  editUrl = "",
}: LeadWelcomeEmailProps) {
  const accent = template.accentColor || "#6f2c3f";
  const vars: TemplateVars = { name, editUrl };
  const ctx = { vars, discountCode, accent };

  return (
    <div
      style={{
        backgroundColor: base.cream,
        fontFamily: 'Georgia, "Times New Roman", Times, serif',
        color: base.charcoal,
        padding: "32px 16px",
      }}
    >
      <div
        style={{
          maxWidth: 520,
          margin: "0 auto",
          backgroundColor: base.surface,
          borderRadius: 16,
          border: `1px solid ${base.border}`,
          overflow: "hidden",
        }}
      >
        {template.blocks.map((block) => renderBlock(block, ctx))}
      </div>
    </div>
  );
}

export default LeadWelcomeEmail;

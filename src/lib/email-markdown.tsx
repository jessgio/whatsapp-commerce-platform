import * as React from "react";
import {
  applyTemplateVars,
  type TemplateVars,
} from "@/lib/email-templates";

const LINK_RE = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;
const BOLD_RE = /\*\*([^*]+)\*\*|__([^_]+)__/g;
const ITALIC_RE = /(?<!\*)\*([^*]+)\*(?!\*)|(?<!_)_([^_]+)_(?!_)/g;

function renderInline(
  text: string,
  keyPrefix: string,
  linkColor: string,
): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  const re = new RegExp(LINK_RE.source, "g");
  let i = 0;

  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      nodes.push(
        ...renderStyledText(text.slice(last, match.index), `${keyPrefix}-t${i}`),
      );
    }
    const label = match[1];
    const href = match[2];
    nodes.push(
      <a
        key={`${keyPrefix}-a${i}`}
        href={href}
        style={{
          color: linkColor,
          textDecoration: "underline",
        }}
      >
        {renderStyledText(label, `${keyPrefix}-al${i}`)}
      </a>,
    );
    last = match.index + match[0].length;
    i += 1;
  }

  if (last < text.length) {
    nodes.push(...renderStyledText(text.slice(last), `${keyPrefix}-t${i}`));
  }

  return nodes.length > 0 ? nodes : [text];
}

function renderStyledText(text: string, keyPrefix: string): React.ReactNode[] {
  // Bold first, then italic within remaining plain segments
  const parts: React.ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  const boldRe = new RegExp(BOLD_RE.source, "g");
  let i = 0;

  while ((match = boldRe.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(
        ...renderItalic(text.slice(last, match.index), `${keyPrefix}-b${i}`),
      );
    }
    const inner = match[1] ?? match[2] ?? "";
    parts.push(
      <strong key={`${keyPrefix}-strong${i}`} style={{ fontWeight: 700 }}>
        {renderItalic(inner, `${keyPrefix}-bi${i}`)}
      </strong>,
    );
    last = match.index + match[0].length;
    i += 1;
  }

  if (last < text.length) {
    parts.push(...renderItalic(text.slice(last), `${keyPrefix}-b${i}`));
  }

  return parts.length > 0 ? parts : [text];
}

function renderItalic(text: string, keyPrefix: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  const italicRe = new RegExp(ITALIC_RE.source, "g");
  let i = 0;

  while ((match = italicRe.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index));
    }
    const inner = match[1] ?? match[2] ?? "";
    parts.push(
      <em key={`${keyPrefix}-em${i}`} style={{ fontStyle: "italic" }}>
        {inner}
      </em>,
    );
    last = match.index + match[0].length;
    i += 1;
  }

  if (last < text.length) {
    parts.push(text.slice(last));
  }

  return parts.length > 0 ? parts : [text];
}

/**
 * Email-safe markdown: links, bold, italic, and line breaks.
 * Template vars like `{name}` / `{edit_url}` are applied first.
 */
export function renderEmailMarkdown(
  raw: string,
  vars: TemplateVars | string,
  linkColor = "#6f2c3f",
): React.ReactNode {
  const text = applyTemplateVars(raw, vars);
  if (!text) return null;

  const lines = text.split("\n");
  return lines.map((line, lineIndex) => (
    <React.Fragment key={`line-${lineIndex}`}>
      {lineIndex > 0 ? <br /> : null}
      {renderInline(line, `l${lineIndex}`, linkColor)}
    </React.Fragment>
  ));
}

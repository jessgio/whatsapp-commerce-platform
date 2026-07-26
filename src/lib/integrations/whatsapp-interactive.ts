import type { WaInteractiveDesign, WaTemplateDesign } from "@/lib/whatsapp-designs";
import { extractTemplateVars } from "@/lib/whatsapp-designs";

/** Build Meta template `components` for variable / media headers. */
export function buildTemplateComponents(
  design: WaTemplateDesign,
  vars: Record<string, string>,
): unknown[] {
  const components: unknown[] = [];

  if (design.header.type === "image" && design.header.imageUrl) {
    components.push({
      type: "header",
      parameters: [
        {
          type: "image",
          image: { link: design.header.imageUrl },
        },
      ],
    });
  }

  const keys = extractTemplateVars(design.body);
  if (keys.length > 0) {
    components.push({
      type: "body",
      parameters: keys.map((k) => ({
        type: "text",
        text: vars[k] || design.variableDefaults[k] || " ",
      })),
    });
  }

  return components;
}

function optionalHeader(text: string): Record<string, unknown> | undefined {
  const trimmed = text.trim();
  if (!trimmed) return undefined;
  return { type: "text", text: trimmed.slice(0, 60) };
}

function optionalFooter(text: string): Record<string, unknown> | undefined {
  const trimmed = text.trim();
  if (!trimmed) return undefined;
  return { text: trimmed.slice(0, 60) };
}

/**
 * Build a Cloud API message payload for an interactive / session design.
 * Returns null when the design cannot form a valid payload.
 */
export function buildInteractivePayload(
  to: string,
  design: WaInteractiveDesign,
): Record<string, unknown> | null {
  const body = design.body.trim();
  if (!body) return null;

  if (design.kind === "text") {
    return {
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { preview_url: false, body: body.slice(0, 4096) },
    };
  }

  if (design.kind === "image") {
    if (!design.imageUrl.trim()) return null;
    return {
      messaging_product: "whatsapp",
      to,
      type: "image",
      image: {
        link: design.imageUrl.trim(),
        caption: body.slice(0, 1024),
      },
    };
  }

  if (design.kind === "reply_buttons") {
    const buttons = design.buttons.slice(0, 3).filter((b) => b.title.trim());
    if (buttons.length === 0) return null;
    const interactive: Record<string, unknown> = {
      type: "button",
      body: { text: body.slice(0, 1024) },
      action: {
        buttons: buttons.map((b) => ({
          type: "reply",
          reply: {
            id: b.id.slice(0, 256),
            title: b.title.trim().slice(0, 20),
          },
        })),
      },
    };
    const header = optionalHeader(design.headerText);
    const footer = optionalFooter(design.footerText);
    if (header) interactive.header = header;
    if (footer) interactive.footer = footer;
    return {
      messaging_product: "whatsapp",
      to,
      type: "interactive",
      interactive,
    };
  }

  if (design.kind === "list") {
    const sections = design.listSections
      .map((sec) => ({
        title: sec.title.trim().slice(0, 24) || "Options",
        rows: sec.rows
          .filter((r) => r.title.trim())
          .slice(0, 10)
          .map((r) => ({
            id: r.id.slice(0, 200),
            title: r.title.trim().slice(0, 24),
            ...(r.description?.trim()
              ? { description: r.description.trim().slice(0, 72) }
              : {}),
          })),
      }))
      .filter((sec) => sec.rows.length > 0)
      .slice(0, 10);

    if (sections.length === 0) return null;

    const interactive: Record<string, unknown> = {
      type: "list",
      body: { text: body.slice(0, 1024) },
      action: {
        button: (design.listButtonLabel.trim() || "Options").slice(0, 20),
        sections,
      },
    };
    const header = optionalHeader(design.headerText);
    const footer = optionalFooter(design.footerText);
    if (header) interactive.header = header;
    if (footer) interactive.footer = footer;
    return {
      messaging_product: "whatsapp",
      to,
      type: "interactive",
      interactive,
    };
  }

  return null;
}

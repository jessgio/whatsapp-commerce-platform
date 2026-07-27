import type { BuiltinEmailFont } from "@/lib/email-style";

export type EmailFontFileFormat = "woff2" | "woff" | "truetype" | "opentype";

export type EmailFontFile = {
  format: EmailFontFileFormat;
  url: string;
  /** Original filename for display */
  filename?: string;
};

export type EmailCustomFont = {
  id: string;
  name: string;
  /** CSS font-family token used in @font-face and inline styles */
  cssFamily: string;
  fallback: BuiltinEmailFont;
  files: EmailFontFile[];
  createdAt: string;
  updatedAt: string;
};

export function sanitizeCssFamily(name: string): string {
  const cleaned = name
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-zA-Z0-9\s_-]/g, "")
    .replace(/\s+/g, "");
  return cleaned || "CustomFont";
}

export function detectFontFormat(
  filename: string,
  mime: string,
): EmailFontFileFormat | null {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".woff2") || mime.includes("woff2")) return "woff2";
  if (lower.endsWith(".woff") || mime.includes("woff")) return "woff";
  if (lower.endsWith(".ttf") || mime.includes("ttf") || mime.includes("truetype")) {
    return "truetype";
  }
  if (lower.endsWith(".otf") || mime.includes("otf") || mime.includes("opentype")) {
    return "opentype";
  }
  return null;
}

/** Build @font-face CSS for clients that support web fonts (Apple Mail, iOS). */
export function buildFontFaceCss(fonts: EmailCustomFont[]): string {
  return fonts
    .map((font) => {
      if (!font.files.length) return "";
      const src = font.files
        .map((f) => `url('${f.url}') format('${f.format}')`)
        .join(", ");
      const family = font.cssFamily.replace(/'/g, "\\'");
      return (
        `@font-face{font-family:'${family}';src:${src};` +
        `font-weight:100 900;font-style:normal;font-display:swap;}`
      );
    })
    .filter(Boolean)
    .join("\n");
}

export function isEmailCustomFont(value: unknown): value is EmailCustomFont {
  if (!value || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.name === "string" &&
    typeof o.cssFamily === "string" &&
    Array.isArray(o.files)
  );
}

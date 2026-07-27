/** Shared typography / layout options for the email block designer. */

import type { EmailCustomFont } from "@/lib/email-fonts";

export type EmailAlign = "left" | "center" | "right";
/** Built-in stacks always available; custom fonts use their `id` as the value. */
export type BuiltinEmailFont = "sans" | "serif" | "mono" | "display";
export type EmailFontFamily = BuiltinEmailFont | string;
export type EmailFontWeight = 400 | 500 | 600 | 700;

/** Email-safe font stacks (clients ignore webfonts unless hosted + MSO-aware). */
export const EMAIL_FONT_STACKS: Record<BuiltinEmailFont, string> = {
  sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  serif: 'Georgia, "Times New Roman", Times, serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
  display: '"Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif',
};

export const EMAIL_FONT_LABELS: Record<BuiltinEmailFont, string> = {
  sans: "Sans (system)",
  serif: "Serif (Georgia)",
  mono: "Monospace",
  display: "Display (Palatino)",
};

export const BUILTIN_FONTS = Object.keys(EMAIL_FONT_LABELS) as BuiltinEmailFont[];

export function isBuiltinFont(value: string | undefined): value is BuiltinEmailFont {
  return Boolean(value && value in EMAIL_FONT_STACKS);
}

export type EmailTextStyle = {
  fontFamily?: EmailFontFamily;
  fontSize?: number;
  fontWeight?: EmailFontWeight;
  align?: EmailAlign;
  /** Hex color, e.g. #2d2b2a. Empty/undefined uses the block default. */
  color?: string;
  /** Unitless line-height multiplier */
  lineHeight?: number;
  /** Letter-spacing in em */
  letterSpacing?: number;
};

export type EmailButtonStyle = EmailTextStyle & {
  backgroundColor?: string;
  borderRadius?: number;
  fullWidth?: boolean;
  paddingY?: number;
  paddingX?: number;
};

export type EmailImageStyle = {
  align?: EmailAlign;
  /** Width as percent of the email column (40–100) */
  widthPercent?: number;
  borderRadius?: number;
};

export type EmailDividerStyle = {
  color?: string;
  thickness?: number;
  /** Horizontal inset in px */
  inset?: number;
};

export type EmailCss = {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  textAlign?: EmailAlign;
  color?: string;
  lineHeight?: number;
  letterSpacing?: string;
};

export const FONT_SIZE_PRESETS = [12, 14, 16, 18, 20, 24, 28, 32, 36] as const;

export function clampFontSize(n: number | undefined, fallback: number): number {
  if (typeof n !== "number" || Number.isNaN(n)) return fallback;
  return Math.min(48, Math.max(10, Math.round(n)));
}

export function resolveFontFamily(
  family: EmailFontFamily | undefined,
  fallback: BuiltinEmailFont,
  customFonts: EmailCustomFont[] = [],
): string {
  const key = family ?? fallback;
  if (isBuiltinFont(key)) return EMAIL_FONT_STACKS[key];
  const custom = customFonts.find((f) => f.id === key);
  if (custom) {
    const stack = EMAIL_FONT_STACKS[custom.fallback] ?? EMAIL_FONT_STACKS.sans;
    return `"${custom.cssFamily}", ${stack}`;
  }
  return EMAIL_FONT_STACKS[fallback];
}

export function isHexColor(value: string | undefined): boolean {
  return Boolean(value && /^#[0-9A-Fa-f]{6}$/.test(value.trim()));
}

export function textStyleToCss(
  style: EmailTextStyle | undefined,
  defaults: {
    fontFamily: BuiltinEmailFont;
    fontSize: number;
    fontWeight?: EmailFontWeight;
    align?: EmailAlign;
    color: string;
    lineHeight?: number;
    letterSpacing?: number;
  },
  customFonts: EmailCustomFont[] = [],
): EmailCss {
  const fontSize = clampFontSize(style?.fontSize, defaults.fontSize);
  const align = style?.align ?? defaults.align ?? "left";
  const color = isHexColor(style?.color) ? style!.color!.trim() : defaults.color;
  const lineHeight = style?.lineHeight ?? defaults.lineHeight ?? 1.5;
  const letterSpacing =
    style?.letterSpacing ?? defaults.letterSpacing ?? undefined;
  const fontWeight = style?.fontWeight ?? defaults.fontWeight ?? 400;

  return {
    fontFamily: resolveFontFamily(
      style?.fontFamily,
      defaults.fontFamily,
      customFonts,
    ),
    fontSize,
    fontWeight,
    textAlign: align,
    color,
    lineHeight,
    ...(typeof letterSpacing === "number"
      ? { letterSpacing: `${letterSpacing}em` }
      : {}),
  };
}

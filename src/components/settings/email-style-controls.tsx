"use client";

import {
  AlignCenter,
  AlignLeft,
  AlignRight,
} from "lucide-react";
import type { EmailCustomFont } from "@/lib/email-fonts";
import {
  BUILTIN_FONTS,
  EMAIL_BRAND_DEFAULT,
  EMAIL_CREAM_DEFAULT,
  EMAIL_FONT_LABELS,
  FONT_SIZE_PRESETS,
  type BuiltinEmailFont,
  type EmailAlign,
  type EmailButtonStyle,
  type EmailDiscountStyle,
  type EmailDividerStyle,
  type EmailFontWeight,
  type EmailHeaderStyle,
  type EmailImageStyle,
  type EmailTextStyle,
} from "@/lib/email-style";
import { Select } from "@/components/select";
import { cn } from "@/lib/utils";

const fieldClass =
  "mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition focus:border-merlot focus:ring-2 focus:ring-merlot/20";

const labelClass = "text-[11px] font-medium uppercase tracking-wide text-muted";

function AlignToggle({
  value,
  onChange,
}: {
  value: EmailAlign;
  onChange: (a: EmailAlign) => void;
}) {
  const opts: { id: EmailAlign; icon: typeof AlignLeft }[] = [
    { id: "left", icon: AlignLeft },
    { id: "center", icon: AlignCenter },
    { id: "right", icon: AlignRight },
  ];
  return (
    <div className="inline-flex rounded-lg border border-border bg-surface-muted/40 p-0.5">
      {opts.map(({ id, icon: Icon }) => (
        <button
          key={id}
          type="button"
          aria-label={`Align ${id}`}
          aria-pressed={value === id}
          onClick={() => onChange(id)}
          className={cn(
            "rounded-md p-1.5 text-muted transition",
            value === id
              ? "bg-surface text-merlot shadow-sm"
              : "hover:text-foreground",
          )}
        >
          <Icon size={14} />
        </button>
      ))}
    </div>
  );
}

export function ColorField({
  label,
  value,
  fallback,
  onChange,
}: {
  label: string;
  value: string | undefined;
  fallback: string;
  onChange: (hex: string | undefined) => void;
}) {
  const current = value && /^#[0-9A-Fa-f]{6}$/.test(value) ? value : fallback;
  return (
    <div>
      <p className={labelClass}>{label}</p>
      <div className="mt-1 flex gap-2">
        <input
          type="color"
          value={current}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-10 cursor-pointer rounded border border-border bg-surface p-1"
        />
        <input
          className={cn(fieldClass, "mt-0")}
          value={value ?? ""}
          placeholder={fallback}
          onChange={(e) => {
            const v = e.target.value.trim();
            onChange(v || undefined);
          }}
        />
        {value ? (
          <button
            type="button"
            className="shrink-0 rounded-lg border border-border px-2 text-xs text-muted hover:bg-surface-muted"
            onClick={() => onChange(undefined)}
          >
            Auto
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function TextStyleControls({
  style,
  onChange,
  defaults,
  customFonts = [],
  showColor = true,
  showLineHeight = true,
  showLetterSpacing = false,
}: {
  style: EmailTextStyle | undefined;
  onChange: (next: EmailTextStyle) => void;
  defaults: {
    fontFamily: BuiltinEmailFont;
    fontSize: number;
    fontWeight: EmailFontWeight;
    align: EmailAlign;
    color: string;
  };
  customFonts?: EmailCustomFont[];
  showColor?: boolean;
  showLineHeight?: boolean;
  showLetterSpacing?: boolean;
}) {
  const s = style ?? {};
  const patch = (partial: Partial<EmailTextStyle>) =>
    onChange({ ...s, ...partial });

  return (
    <div className="@container space-y-2.5 rounded-lg border border-border bg-surface-muted/30 p-3">
      <p className="text-xs font-semibold text-foreground">Typography & layout</p>
      <div className="grid gap-2 @[260px]:grid-cols-2">
        <div>
          <p className={labelClass}>Font</p>
          <Select
            className="mt-1 w-full"
            value={s.fontFamily ?? defaults.fontFamily}
            onChange={(v) => patch({ fontFamily: v })}
            options={[
              {
                label: "System",
                options: BUILTIN_FONTS.map((k) => ({
                  value: k,
                  label: EMAIL_FONT_LABELS[k],
                })),
              },
              ...(customFonts.length
                ? [
                    {
                      label: "Brand fonts",
                      options: customFonts.map((f) => ({
                        value: f.id,
                        label: f.name,
                      })),
                    },
                  ]
                : []),
            ]}
          />
        </div>
        <div>
          <p className={labelClass}>Size</p>
          <Select
            className="mt-1 w-full"
            value={String(s.fontSize ?? defaults.fontSize)}
            onChange={(v) => patch({ fontSize: Number(v) })}
            options={FONT_SIZE_PRESETS.map((n) => ({
              value: String(n),
              label: `${n}px`,
            }))}
          />
        </div>
        <div>
          <p className={labelClass}>Weight</p>
          <Select
            className="mt-1 w-full"
            value={String(s.fontWeight ?? defaults.fontWeight)}
            onChange={(v) =>
              patch({ fontWeight: Number(v) as EmailFontWeight })
            }
            options={[
              { value: "400", label: "Regular" },
              { value: "500", label: "Medium" },
              { value: "600", label: "Semibold" },
              { value: "700", label: "Bold" },
            ]}
          />
        </div>
        <div>
          <p className={labelClass}>Align</p>
          <div className="mt-1">
            <AlignToggle
              value={s.align ?? defaults.align}
              onChange={(align) => patch({ align })}
            />
          </div>
        </div>
        {showLineHeight ? (
          <div>
            <p className={labelClass}>Line height</p>
            <Select
              className="mt-1 w-full"
              value={String(s.lineHeight ?? 1.5)}
              onChange={(v) => patch({ lineHeight: Number(v) })}
              options={[1.2, 1.35, 1.5, 1.6, 1.8, 2].map((n) => ({
                value: String(n),
                label: String(n),
              }))}
            />
          </div>
        ) : null}
        {showLetterSpacing ? (
          <div>
            <p className={labelClass}>Letter spacing</p>
            <Select
              className="mt-1 w-full"
              value={String(s.letterSpacing ?? 0)}
              onChange={(v) => patch({ letterSpacing: Number(v) })}
              options={[0, 0.02, 0.04, 0.08, 0.12, 0.18].map((n) => ({
                value: String(n),
                label: n === 0 ? "Normal" : `${n}em`,
              }))}
            />
          </div>
        ) : null}
      </div>
      {showColor ? (
        <ColorField
          label="Text color"
          value={s.color}
          fallback={defaults.color}
          onChange={(color) => patch({ color })}
        />
      ) : null}
    </div>
  );
}

export function ImageStyleControls({
  style,
  onChange,
}: {
  style: EmailImageStyle | undefined;
  onChange: (next: EmailImageStyle) => void;
}) {
  const s = style ?? {};
  const patch = (partial: Partial<EmailImageStyle>) =>
    onChange({ ...s, ...partial });

  return (
    <div className="@container space-y-2.5 rounded-lg border border-border bg-surface-muted/30 p-3">
      <p className="text-xs font-semibold text-foreground">Image layout</p>
      <div className="grid gap-2 @[260px]:grid-cols-2">
        <div>
          <p className={labelClass}>Align</p>
          <div className="mt-1">
            <AlignToggle
              value={s.align ?? "center"}
              onChange={(align) => patch({ align })}
            />
          </div>
        </div>
        <div>
          <p className={labelClass}>Width</p>
          <Select
            className="mt-1 w-full"
            value={String(s.widthPercent ?? 100)}
            onChange={(v) => patch({ widthPercent: Number(v) })}
            options={[100, 90, 80, 70, 60, 50].map((n) => ({
              value: String(n),
              label: `${n}%`,
            }))}
          />
        </div>
        <div className="@[260px]:col-span-2">
          <p className={labelClass}>Corner radius</p>
          <input
            type="range"
            min={0}
            max={24}
            value={s.borderRadius ?? 0}
            onChange={(e) => patch({ borderRadius: Number(e.target.value) })}
            className="mt-2 w-full accent-merlot"
          />
          <p className="mt-0.5 text-[11px] text-muted">
            {s.borderRadius ?? 0}px
          </p>
        </div>
      </div>
    </div>
  );
}

export function ButtonStyleControls({
  style,
  onChange,
  accentFallback,
  customFonts = [],
}: {
  style: EmailButtonStyle | undefined;
  onChange: (next: EmailButtonStyle) => void;
  accentFallback: string;
  customFonts?: EmailCustomFont[];
}) {
  const s = style ?? {};
  const patch = (partial: Partial<EmailButtonStyle>) =>
    onChange({ ...s, ...partial });

  return (
    <div className="space-y-3">
      <TextStyleControls
        style={s}
        onChange={(next) => onChange({ ...s, ...next })}
        defaults={{
          fontFamily: "sans",
          fontSize: 14,
          fontWeight: 600,
          align: "center",
          color: "#fbf6ee",
        }}
        customFonts={customFonts}
        showLineHeight={false}
      />
      <div className="@container space-y-2.5 rounded-lg border border-border bg-surface-muted/30 p-3">
        <p className="text-xs font-semibold text-foreground">Button chrome</p>
        <ColorField
          label="Background"
          value={s.backgroundColor}
          fallback={accentFallback}
          onChange={(backgroundColor) => patch({ backgroundColor })}
        />
        <div className="grid gap-2 @[260px]:grid-cols-2">
          <div>
            <p className={labelClass}>Corner radius</p>
            <input
              type="range"
              min={0}
              max={28}
              value={s.borderRadius ?? 10}
              onChange={(e) => patch({ borderRadius: Number(e.target.value) })}
              className="mt-2 w-full accent-merlot"
            />
            <p className="text-[11px] text-muted">{s.borderRadius ?? 10}px</p>
          </div>
          <label className="mt-5 flex items-center gap-2 text-xs text-foreground">
            <input
              type="checkbox"
              className="accent-merlot"
              checked={Boolean(s.fullWidth)}
              onChange={(e) => patch({ fullWidth: e.target.checked })}
            />
            Full width
          </label>
          <div>
            <p className={labelClass}>Vertical padding</p>
            <input
              type="range"
              min={8}
              max={24}
              value={s.paddingY ?? 12}
              onChange={(e) => patch({ paddingY: Number(e.target.value) })}
              className="mt-2 w-full accent-merlot"
            />
            <p className="text-[11px] text-muted">{s.paddingY ?? 12}px</p>
          </div>
          <div>
            <p className={labelClass}>Horizontal padding</p>
            <input
              type="range"
              min={12}
              max={48}
              value={s.paddingX ?? 22}
              onChange={(e) => patch({ paddingX: Number(e.target.value) })}
              className="mt-2 w-full accent-merlot"
            />
            <p className="text-[11px] text-muted">{s.paddingX ?? 22}px</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DividerStyleControls({
  style,
  onChange,
}: {
  style: EmailDividerStyle | undefined;
  onChange: (next: EmailDividerStyle) => void;
}) {
  const s = style ?? {};
  const patch = (partial: Partial<EmailDividerStyle>) =>
    onChange({ ...s, ...partial });

  return (
    <div className="@container space-y-2.5 rounded-lg border border-border bg-surface-muted/30 p-3">
      <p className="text-xs font-semibold text-foreground">Divider style</p>
      <ColorField
        label="Color"
        value={s.color}
        fallback="#e6dccb"
        onChange={(color) => patch({ color })}
      />
      <div className="grid gap-2 @[260px]:grid-cols-2">
        <div>
          <p className={labelClass}>Thickness</p>
          <Select
            className="mt-1 w-full"
            value={String(s.thickness ?? 1)}
            onChange={(v) => patch({ thickness: Number(v) })}
            options={[1, 2, 3, 4].map((n) => ({
              value: String(n),
              label: `${n}px`,
            }))}
          />
        </div>
        <div>
          <p className={labelClass}>Side inset</p>
          <Select
            className="mt-1 w-full"
            value={String(s.inset ?? 32)}
            onChange={(v) => patch({ inset: Number(v) })}
            options={[0, 16, 24, 32, 48].map((n) => ({
              value: String(n),
              label: `${n}px`,
            }))}
          />
        </div>
      </div>
    </div>
  );
}

export function HeaderChromeControls({
  style,
  onChange,
}: {
  style: EmailHeaderStyle | undefined;
  onChange: (next: EmailHeaderStyle) => void;
}) {
  const s = style ?? {};
  return (
    <div className="space-y-2.5 rounded-lg border border-border bg-surface-muted/30 p-3">
      <p className="text-xs font-semibold text-foreground">Header chrome</p>
      <ColorField
        label="Background"
        value={s.backgroundColor}
        fallback={EMAIL_BRAND_DEFAULT}
        onChange={(backgroundColor) => onChange({ ...s, backgroundColor })}
      />
    </div>
  );
}

export function DiscountChromeControls({
  style,
  onChange,
}: {
  style: EmailDiscountStyle | undefined;
  onChange: (next: EmailDiscountStyle) => void;
}) {
  const s = style ?? {};
  const patch = (partial: Partial<EmailDiscountStyle>) =>
    onChange({ ...s, ...partial });

  return (
    <div className="space-y-2.5 rounded-lg border border-border bg-surface-muted/30 p-3">
      <p className="text-xs font-semibold text-foreground">Discount chrome</p>
      <ColorField
        label="Code color"
        value={s.codeColor}
        fallback={EMAIL_BRAND_DEFAULT}
        onChange={(codeColor) => patch({ codeColor })}
      />
      <ColorField
        label="Background"
        value={s.backgroundColor}
        fallback={EMAIL_CREAM_DEFAULT}
        onChange={(backgroundColor) => patch({ backgroundColor })}
      />
      <ColorField
        label="Border"
        value={s.borderColor}
        fallback={EMAIL_BRAND_DEFAULT}
        onChange={(borderColor) => patch({ borderColor })}
      />
    </div>
  );
}

"use client";

import {
  AlignCenter,
  AlignLeft,
  AlignRight,
} from "lucide-react";
import type { EmailCustomFont } from "@/lib/email-fonts";
import {
  BUILTIN_FONTS,
  EMAIL_FONT_LABELS,
  FONT_SIZE_PRESETS,
  type BuiltinEmailFont,
  type EmailAlign,
  type EmailButtonStyle,
  type EmailDividerStyle,
  type EmailFontWeight,
  type EmailImageStyle,
  type EmailTextStyle,
} from "@/lib/email-style";
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

function ColorField({
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
          <select
            className={fieldClass}
            value={s.fontFamily ?? defaults.fontFamily}
            onChange={(e) => patch({ fontFamily: e.target.value })}
          >
            <optgroup label="System">
              {BUILTIN_FONTS.map((k) => (
                <option key={k} value={k}>
                  {EMAIL_FONT_LABELS[k]}
                </option>
              ))}
            </optgroup>
            {customFonts.length > 0 ? (
              <optgroup label="Brand fonts">
                {customFonts.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </optgroup>
            ) : null}
          </select>
        </div>
        <div>
          <p className={labelClass}>Size</p>
          <select
            className={fieldClass}
            value={s.fontSize ?? defaults.fontSize}
            onChange={(e) => patch({ fontSize: Number(e.target.value) })}
          >
            {FONT_SIZE_PRESETS.map((n) => (
              <option key={n} value={n}>
                {n}px
              </option>
            ))}
          </select>
        </div>
        <div>
          <p className={labelClass}>Weight</p>
          <select
            className={fieldClass}
            value={s.fontWeight ?? defaults.fontWeight}
            onChange={(e) =>
              patch({ fontWeight: Number(e.target.value) as EmailFontWeight })
            }
          >
            <option value={400}>Regular</option>
            <option value={500}>Medium</option>
            <option value={600}>Semibold</option>
            <option value={700}>Bold</option>
          </select>
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
            <select
              className={fieldClass}
              value={String(s.lineHeight ?? 1.5)}
              onChange={(e) => patch({ lineHeight: Number(e.target.value) })}
            >
              {[1.2, 1.35, 1.5, 1.6, 1.8, 2].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        {showLetterSpacing ? (
          <div>
            <p className={labelClass}>Letter spacing</p>
            <select
              className={fieldClass}
              value={String(s.letterSpacing ?? 0)}
              onChange={(e) =>
                patch({ letterSpacing: Number(e.target.value) })
              }
            >
              {[0, 0.02, 0.04, 0.08, 0.12, 0.18].map((n) => (
                <option key={n} value={n}>
                  {n === 0 ? "Normal" : `${n}em`}
                </option>
              ))}
            </select>
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
          <select
            className={fieldClass}
            value={s.widthPercent ?? 100}
            onChange={(e) => patch({ widthPercent: Number(e.target.value) })}
          >
            {[100, 90, 80, 70, 60, 50].map((n) => (
              <option key={n} value={n}>
                {n}%
              </option>
            ))}
          </select>
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
          <select
            className={fieldClass}
            value={s.thickness ?? 1}
            onChange={(e) => patch({ thickness: Number(e.target.value) })}
          >
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>
                {n}px
              </option>
            ))}
          </select>
        </div>
        <div>
          <p className={labelClass}>Side inset</p>
          <select
            className={fieldClass}
            value={s.inset ?? 32}
            onChange={(e) => patch({ inset: Number(e.target.value) })}
          >
            {[0, 16, 24, 32, 48].map((n) => (
              <option key={n} value={n}>
                {n}px
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

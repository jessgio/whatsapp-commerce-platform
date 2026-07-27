"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/** Shared input chrome for every inspector field. */
export const editorFieldClass =
  "mt-1 w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[13px] text-foreground outline-none transition focus:border-merlot focus:ring-2 focus:ring-merlot/20";

export function EditorToggle({
  label,
  checked,
  disabled,
  hint,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  hint?: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      className={cn(
        "flex items-start gap-2 text-[13px] text-foreground",
        disabled && "opacity-60",
      )}
    >
      <input
        type="checkbox"
        className="mt-0.5 size-3.5 shrink-0 accent-merlot"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="min-w-0">
        {label}
        {hint ? (
          <span className="block text-[11px] leading-relaxed text-muted">
            {hint}
          </span>
        ) : null}
      </span>
    </label>
  );
}

export function EditorColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (hex: string) => void;
}) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
        {label}
      </p>
      <div className="mt-1 flex gap-1.5">
        <input
          type="color"
          aria-label={label}
          value={/^#[0-9A-Fa-f]{6}$/.test(value) ? value : "#6f2c3f"}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-9 shrink-0 cursor-pointer rounded border border-border bg-surface p-0.5"
        />
        <input
          className={cn(editorFieldClass, "mt-0 font-mono")}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}

export function EditorSlider({
  label,
  value,
  min,
  max,
  step = 1,
  suffix = "px",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
          {label}
        </p>
        <span className="text-[11px] tabular-nums text-muted">
          {value}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1.5 w-full accent-merlot"
      />
    </div>
  );
}

/**
 * Uncontrolled-feeling text input: keeps a local buffer so typing never waits
 * on the document reducer, while still committing every keystroke upward.
 */
export function EditorTextInput({
  value,
  onChange,
  multiline,
  rows = 3,
  className,
  ...rest
}: {
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  rows?: number;
  className?: string;
} & Omit<
  React.InputHTMLAttributes<HTMLInputElement> &
    React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  "value" | "onChange" | "rows" | "className"
>) {
  if (multiline) {
    return (
      <textarea
        {...rest}
        rows={rows}
        className={cn(editorFieldClass, "resize-y leading-relaxed", className)}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  return (
    <input
      {...rest}
      className={cn(editorFieldClass, className)}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

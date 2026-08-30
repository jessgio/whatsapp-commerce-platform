"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export type SelectGroup = {
  label: string;
  options: SelectOption[];
};

type SelectItem = SelectOption | SelectGroup;

function isGroup(item: SelectItem): item is SelectGroup {
  return "options" in item;
}

function flatten(items: SelectItem[]): SelectOption[] {
  return items.flatMap((item) => (isGroup(item) ? item.options : [item]));
}

export function Select({
  id,
  name,
  value,
  onChange,
  options,
  disabled,
  required,
  className,
  placeholder = "Select…",
  size = "md",
}: {
  id?: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectItem[];
  disabled?: boolean;
  required?: boolean;
  className?: string;
  placeholder?: string;
  size?: "sm" | "md";
}) {
  const uid = useId();
  const buttonId = id ?? uid;
  const listId = `${buttonId}-list`;
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);

  const flat = flatten(options);
  const selected = flat.find((o) => o.value === value);
  const label = selected?.label ?? placeholder;

  function place() {
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const spaceAbove = rect.top - 8;
    const openUp = spaceBelow < 160 && spaceAbove > spaceBelow;
    const maxHeight = Math.min(280, Math.max(120, openUp ? spaceAbove : spaceBelow));
    setCoords({
      top: openUp ? rect.top - 4 : rect.bottom + 4,
      left: rect.left,
      width: Math.max(rect.width, 140),
      maxHeight,
    });
  }

  useLayoutEffect(() => {
    if (!open) return;
    place();
    const onReposition = () => place();
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function choose(next: string) {
    onChange(next);
    setOpen(false);
    buttonRef.current?.focus();
  }

  const menu =
    open && coords && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={menuRef}
            id={listId}
            role="listbox"
            aria-labelledby={buttonId}
            style={{
              position: "fixed",
              top: coords.top,
              left: coords.left,
              width: coords.width,
              maxHeight: coords.maxHeight,
              transform: coords.top < (buttonRef.current?.getBoundingClientRect().bottom ?? 0)
                ? "translateY(-100%)"
                : undefined,
              zIndex: 80,
            }}
            className="overflow-y-auto rounded-lg border border-border bg-surface py-1 shadow-[0_8px_30px_rgba(45,43,42,0.12)]"
          >
            {options.map((item) => {
              if (isGroup(item)) {
                return (
                  <div key={item.label}>
                    <p className="px-2.5 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-muted">
                      {item.label}
                    </p>
                    {item.options.map((opt) => (
                      <OptionRow
                        key={opt.value}
                        option={opt}
                        selected={opt.value === value}
                        onChoose={choose}
                      />
                    ))}
                  </div>
                );
              }
              return (
                <OptionRow
                  key={item.value}
                  option={item}
                  selected={item.value === value}
                  onChoose={choose}
                />
              );
            })}
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      {name ? (
        <input type="hidden" name={name} value={value} required={required} />
      ) : null}
      <button
        ref={buttonRef}
        type="button"
        id={buttonId}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => !disabled && setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-surface text-left text-foreground outline-none transition",
          "hover:bg-surface-muted/60 focus:border-merlot focus:ring-2 focus:ring-merlot/20",
          "disabled:pointer-events-none disabled:opacity-50",
          size === "sm" ? "px-2.5 py-1.5 text-xs font-medium" : "px-3 py-2 text-sm",
        )}
      >
        <span className={cn("min-w-0 truncate", !selected && "text-muted")}>
          {label}
        </span>
        <ChevronDown
          size={14}
          className={cn("shrink-0 text-muted transition", open && "rotate-180")}
        />
      </button>
      {menu}
    </div>
  );
}

function OptionRow({
  option,
  selected,
  onChoose,
}: {
  option: SelectOption;
  selected: boolean;
  onChoose: (value: string) => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      disabled={option.disabled}
      onClick={() => onChoose(option.value)}
      className={cn(
        "flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left text-sm",
        option.disabled
          ? "pointer-events-none opacity-40"
          : selected
            ? "bg-merlot/10 text-merlot"
            : "text-foreground hover:bg-surface-muted",
      )}
    >
      <span className="min-w-0 truncate">{option.label}</span>
      {selected ? <Check size={14} className="shrink-0" /> : null}
    </button>
  );
}

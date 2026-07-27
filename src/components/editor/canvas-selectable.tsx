"use client";

import type * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Click target around a piece of live preview.
 *
 * The preview itself is `pointer-events-none` so clicks always fall through to
 * this wrapper instead of activating links or focusing inputs in the canvas.
 */
export function CanvasSelectable({
  id,
  label,
  selected,
  onSelect,
  className,
  children,
}: {
  id: string;
  label: string;
  selected: boolean;
  onSelect: (id: string) => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Select ${label}`}
      aria-pressed={selected}
      onClick={() => onSelect(id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(id);
        }
      }}
      className={cn(
        "group relative block w-full cursor-pointer text-left outline-none",
        className,
      )}
    >
      <div className="pointer-events-none">{children}</div>

      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 rounded-[3px] ring-inset transition-shadow",
          selected
            ? "ring-2 ring-merlot"
            : "ring-1 ring-transparent group-hover:ring-merlot/40 group-focus-visible:ring-2 group-focus-visible:ring-merlot/60",
        )}
      />

      {/* Anchored right so it never covers the leading word or logo. */}
      {selected ? (
        <span
          aria-hidden
          className="pointer-events-none absolute right-0 top-0 z-10 rounded-bl-md bg-merlot px-1.5 py-0.5 text-[10px] font-medium leading-none text-white"
        >
          {label}
        </span>
      ) : null}
    </div>
  );
}

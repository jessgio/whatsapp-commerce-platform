"use client";

import { useEffect, useRef, useState } from "react";
import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isSameDay,
  isSameMonth,
  setMonth,
  setYear,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function parseIso(iso: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toIso(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

export function DatePicker({
  name,
  value,
  onChange,
  placeholder = "dd/mm/yyyy",
  max,
  className,
}: {
  name?: string;
  value: string;
  onChange: (iso: string) => void;
  placeholder?: string;
  /** Inclusive ISO max (e.g. today). Later days are disabled. */
  max?: string;
  className?: string;
}) {
  const selected = parseIso(value);
  const maxDate = max ? parseIso(max) : null;
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<"days" | "months" | "years">("days");
  const [view, setView] = useState(() => selected ?? new Date());
  const rootRef = useRef<HTMLDivElement>(null);
  const yearListRef = useRef<HTMLDivElement>(null);

  const maxYear = maxDate?.getFullYear() ?? new Date().getFullYear() + 10;
  const yearOptions = Array.from({ length: maxYear - 1920 + 1 }, (_, i) => maxYear - i);

  const monthStart = startOfMonth(view);
  const days = eachDayOfInterval({
    start: startOfWeek(monthStart, { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(view), { weekStartsOn: 1 }),
  });

  useEffect(() => {
    if (!open) return;
    function onPointer(e: PointerEvent) {
      if (rootRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (panel !== "days") {
          setPanel("days");
          return;
        }
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, panel]);

  useEffect(() => {
    if (panel !== "years") return;
    const active = yearListRef.current?.querySelector("[data-active-year]");
    active?.scrollIntoView({ block: "center" });
  }, [panel, view]);

  function pick(day: Date) {
    if (maxDate && isAfter(day, maxDate)) return;
    onChange(toIso(day));
    setOpen(false);
    setPanel("days");
  }

  return (
    <div ref={rootRef} className={cn("relative text-left", className)}>
      {name ? <input type="hidden" name={name} value={value} /> : null}
      <button
        type="button"
        onClick={() => {
          setView(selected ?? new Date());
          setPanel("days");
          setOpen((v) => !v);
        }}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-left text-sm outline-none focus:border-merlot"
      >
        <span className={selected ? "text-foreground" : "text-muted"}>
          {selected ? format(selected, "dd/MM/yyyy") : placeholder}
        </span>
        <Calendar size={15} className="shrink-0 text-muted" />
      </button>

      {open ? (
        <div className="absolute left-0 right-0 z-20 mt-1 rounded-xl border border-border bg-surface p-3 shadow-[0_12px_32px_rgba(45,43,42,0.12)]">
          <div className="mb-2 flex items-center gap-1">
            <button
              type="button"
              className="shrink-0 rounded-md p-1 text-muted hover:bg-surface-muted hover:text-foreground"
              onClick={() => setView((d) => addMonths(d, -1))}
              aria-label="Previous month"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              aria-label="Choose month"
              aria-expanded={panel === "months"}
              onClick={() => setPanel((p) => (p === "months" ? "days" : "months"))}
              className={cn(
                "flex min-w-0 flex-1 items-center justify-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium text-foreground hover:bg-surface-muted",
                panel === "months" && "bg-surface-muted",
              )}
            >
              <span className="truncate">{format(view, "MMMM")}</span>
              <ChevronDown size={12} className={cn("shrink-0 text-muted", panel === "months" && "rotate-180")} />
            </button>
            <button
              type="button"
              aria-label="Choose year"
              aria-expanded={panel === "years"}
              onClick={() => setPanel((p) => (p === "years" ? "days" : "years"))}
              className={cn(
                "flex w-[4.5rem] shrink-0 items-center justify-center gap-0.5 rounded-md px-1 py-1 text-xs font-medium text-foreground hover:bg-surface-muted",
                panel === "years" && "bg-surface-muted",
              )}
            >
              {view.getFullYear()}
              <ChevronDown size={12} className={cn("shrink-0 text-muted", panel === "years" && "rotate-180")} />
            </button>
            <button
              type="button"
              className="shrink-0 rounded-md p-1 text-muted hover:bg-surface-muted hover:text-foreground"
              onClick={() => setView((d) => addMonths(d, 1))}
              aria-label="Next month"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {panel === "months" ? (
            <div className="grid grid-cols-3 gap-1">
              {MONTHS.map((label, i) => {
                const active = view.getMonth() === i;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => {
                      setView((d) => setMonth(d, i));
                      setPanel("days");
                    }}
                    className={cn(
                      "rounded-md px-1 py-2 text-xs",
                      active
                        ? "bg-merlot text-white"
                        : "text-foreground hover:bg-surface-muted",
                    )}
                  >
                    {label.slice(0, 3)}
                  </button>
                );
              })}
            </div>
          ) : null}

          {panel === "years" ? (
            <div ref={yearListRef} className="grid max-h-52 grid-cols-3 gap-1 overflow-y-auto pr-0.5">
              {yearOptions.map((y) => {
                const active = view.getFullYear() === y;
                return (
                  <button
                    key={y}
                    type="button"
                    data-active-year={active ? "" : undefined}
                    onClick={() => {
                      setView((d) => setYear(d, y));
                      setPanel("days");
                    }}
                    className={cn(
                      "rounded-md px-1 py-2 text-xs",
                      active
                        ? "bg-merlot text-white"
                        : "text-foreground hover:bg-surface-muted",
                    )}
                  >
                    {y}
                  </button>
                );
              })}
            </div>
          ) : null}

          {panel === "days" ? (
            <div className="grid grid-cols-7 gap-0.5 text-center text-[11px] text-muted">
              {WEEKDAYS.map((d) => (
                <div key={d} className="py-1 font-medium">
                  {d}
                </div>
              ))}
              {days.map((day) => {
                const inMonth = isSameMonth(day, view);
                const isSelected = selected ? isSameDay(day, selected) : false;
                const disabled = Boolean(maxDate && isAfter(day, maxDate));
                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    disabled={disabled}
                    onClick={() => pick(day)}
                    className={cn(
                      "h-8 rounded-md text-xs",
                      !inMonth && "text-muted/50",
                      inMonth && !isSelected && "text-foreground hover:bg-surface-muted",
                      isSelected && "bg-merlot text-white hover:bg-merlot",
                      disabled && "cursor-not-allowed opacity-30 hover:bg-transparent",
                    )}
                  >
                    {format(day, "d")}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

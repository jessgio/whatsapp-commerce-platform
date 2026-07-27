"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Loader2, MapPin } from "lucide-react";
import type { CitySuggestion } from "@/lib/cities";
import { cn } from "@/lib/utils";

const fieldClass =
  "mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-merlot focus:ring-2 focus:ring-merlot/20";

export function CityCombobox({
  id,
  value,
  onChange,
  placeholder = "Ketik lalu pilih kota…",
}: {
  id?: string;
  value: string;
  onChange: (city: string) => void;
  placeholder?: string;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState(value);
  const [selected, setSelected] = useState(Boolean(value));
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<CitySuggestion[]>([]);
  const [lastValue, setLastValue] = useState(value);

  if (value !== lastValue) {
    setLastValue(value);
    // Adopt values the parent set (initial load, external reset), but ignore the
    // empty value we push up ourselves when the user starts editing a confirmed
    // pick — echoing it back would wipe the keystroke they just typed.
    if (value || selected) {
      setQuery(value);
      setSelected(Boolean(value));
    }
  }

  useEffect(() => {
    const q = query.trim();
    if ((selected && query === value) || q.length < 2) return;

    const ctrl = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/public/cities?q=${encodeURIComponent(q)}`, {
          signal: ctrl.signal,
        });
        const json = (await res.json()) as { cities?: CitySuggestion[] };
        setOptions(json.cities ?? []);
        setOpen(true);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setOptions([]);
      } finally {
        setLoading(false);
      }
    }, 280);

    return () => {
      ctrl.abort();
      window.clearTimeout(timer);
    };
  }, [query, selected, value]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function pick(city: CitySuggestion) {
    setSelected(true);
    setQuery(city.label);
    onChange(city.label);
    setOpen(false);
    setOptions([]);
  }

  function onInput(next: string) {
    setSelected(false);
    setQuery(next);
    if (next.trim().length < 2) setOptions([]);
    if (value) onChange("");
  }

  function onBlur() {
    // Keep only a confirmed selection so free-text never slips through.
    window.setTimeout(() => {
      if (!selected) {
        setQuery(value || "");
        setOpen(false);
      }
    }, 120);
  }

  return (
    <div ref={rootRef} className="relative">
      <div className="relative">
        <MapPin
          size={15}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
        />
        <input
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          value={query}
          onChange={(e) => onInput(e.target.value)}
          onFocus={() => {
            if (options.length) setOpen(true);
          }}
          onBlur={onBlur}
          className={cn(fieldClass, "pl-9 pr-9")}
          placeholder={placeholder}
        />
        {loading && (
          <Loader2
            size={15}
            className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted"
          />
        )}
      </div>

      {open && options.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-border bg-surface py-1 shadow-[0_8px_24px_rgba(45,43,42,0.12)]"
        >
          {options.map((city) => (
            <li key={city.id}>
              <button
                type="button"
                role="option"
                aria-selected={false}
                className="flex w-full px-3 py-2 text-left text-sm text-foreground hover:bg-surface-muted"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(city)}
              >
                <span className="font-medium">{city.name}</span>
                <span className="ml-1 text-muted">
                  {[city.admin1, city.country].filter(Boolean).join(", ")}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && !loading && query.trim().length >= 2 && options.length === 0 && !selected && (
        <p className="mt-1 text-xs text-muted">Tidak ada kota yang cocok. Coba nama lain.</p>
      )}

      <p className="mt-1 text-xs text-muted">
        Ketik minimal 2 huruf, lalu pilih dari daftar agar data segmentasi bersih.
      </p>
    </div>
  );
}

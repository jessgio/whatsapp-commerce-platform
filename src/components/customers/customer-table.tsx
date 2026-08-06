"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Avatar, Table, Th, Td } from "@/components/ui";
import { ConsentBadge } from "@/components/status";
import { formatIDRCompact, formatDate, formatDateTime } from "@/lib/format";
import { customerMatchesRules, type SegmentDefinition } from "@/lib/segments";
import type { Customer } from "@/lib/types";

const MAX_ROWS = 100;

/** Prefer QR form acceptance time; fall back to row creation. */
function signedUpAt(c: Customer): string | null {
  return c.termsAcceptedAt || c.createdAt || null;
}

export function CustomerTable({
  customers,
  total,
  canSeePii,
  segments = [],
}: {
  customers: Customer[];
  /**
   * Every customer in the database. `customers` is only the page that was
   * loaded, so searching and segment filtering here cover that page alone.
   */
  total: number;
  canSeePii: boolean;
  segments?: SegmentDefinition[];
}) {
  const [q, setQ] = useState("");
  const [segment, setSegment] = useState("all");

  const filtered = useMemo(() => {
    const term = q.toLowerCase();
    const saved = segments.find((s) => s.id === segment);
    // One clock reading for the whole pass; rule matching is relative to "now"
    // and a per-row Date would also make the results inconsistent mid-filter.
    const now = new Date();

    return customers.filter((c) => {
      const matchesTerm =
        !term ||
        c.name.toLowerCase().includes(term) ||
        c.phone.includes(term) ||
        c.waId.includes(term) ||
        (c.city?.toLowerCase().includes(term) ?? false);

      if (!matchesTerm) return false;

      if (segment === "all") return true;
      if (saved) return customerMatchesRules(c, saved.rules, now);
      // Built-in legacy labels still stored on customers.segments
      return c.segments.includes(segment);
    });
  }, [customers, q, segment, segments]);

  const visible = filtered.slice(0, MAX_ROWS);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 md:max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, phone, city…"
            className="w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-3 text-sm outline-none focus:border-merlot"
          />
        </div>
        <select
          value={segment}
          onChange={(e) => setSegment(e.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-merlot"
        >
          <option value="all">All customers</option>
          {segments.length > 0 && (
            <optgroup label="Saved segments">
              {segments.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </optgroup>
          )}
          <optgroup label="Legacy labels">
            <option value="VIP">VIP</option>
            <option value="Repeat">Repeat</option>
            <option value="New">New</option>
          </optgroup>
        </select>
        <Link
          href="/customers/segments"
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-merlot hover:bg-surface-muted"
        >
          Manage segments
        </Link>
        <span className="ml-auto text-xs text-muted">{filtered.length} customers</span>
      </div>

      {total > customers.length && (
        <p className="mb-3 text-xs text-muted">
          Searching the {customers.length} most recent of {total} customers.
          Save a segment to query the full list.
        </p>
      )}

      <Table>
        <thead>
          <tr>
            <Th>Customer</Th>
            <Th>Consent</Th>
            <Th>Segments</Th>
            <Th>Signed up</Th>
            <Th>Discount</Th>
            <Th className="text-right">Orders</Th>
            <Th className="text-right">Lifetime value</Th>
            <Th>Last order</Th>
          </tr>
        </thead>
        <tbody>
          {visible.map((c) => {
            const signup = signedUpAt(c);
            return (
            <tr key={c.id} className="transition-colors hover:bg-surface-muted">
              <Td>
                <Link href={`/customers/${c.id}`} className="flex items-center gap-3">
                  <Avatar name={c.name} color="#6f2c3f" size={34} />
                  <div>
                    <div className="text-sm font-medium text-foreground">{c.name}</div>
                    <div className="text-xs text-muted">
                      {canSeePii ? c.phone : "•••• masked ••••"} · {c.city}
                    </div>
                  </div>
                </Link>
              </Td>
              <Td><ConsentBadge status={c.consentStatus} /></Td>
              <Td>
                <div className="flex flex-wrap gap-1">
                  {c.segments.map((s) => (
                    <span key={s} className="rounded-full bg-beige-200 px-2 py-0.5 text-[11px] text-brown">
                      {s}
                    </span>
                  ))}
                </div>
              </Td>
              <Td className="whitespace-nowrap text-sm text-muted">
                {signup ? formatDateTime(signup) : "—"}
              </Td>
              <Td className="text-sm">
                {c.leadDiscountCode ? (
                  <span className="font-mono text-xs tracking-wide text-foreground">
                    {c.leadDiscountCode}
                  </span>
                ) : (
                  <span className="text-muted">—</span>
                )}
              </Td>
              <Td className="text-right text-sm">{c.orderCount}</Td>
              <Td className="text-right text-sm font-medium">{formatIDRCompact(c.lifetimeValue)}</Td>
              <Td className="text-sm text-muted">{c.lastOrderAt ? formatDate(c.lastOrderAt) : "—"}</Td>
            </tr>
            );
          })}
        </tbody>
      </Table>

      {filtered.length > visible.length && (
        <p className="mt-3 text-center text-xs text-muted">
          Showing the first {MAX_ROWS} of {filtered.length}. Narrow the search or
          pick a segment to see the rest.
        </p>
      )}
    </div>
  );
}

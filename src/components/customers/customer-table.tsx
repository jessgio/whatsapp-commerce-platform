"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Avatar, Select, Table, Th, Td } from "@/components/ui";
import { ConsentBadge } from "@/components/status";
import { formatIDRCompact, formatDate, formatDateTime, formatNumber } from "@/lib/format";
import { customerMatchesRules, type SegmentDefinition } from "@/lib/segments";
import { matchesCustomerSource, type CustomerSource } from "@/lib/customers/source";
import type { Customer } from "@/lib/types";
import { CustomerRowActions } from "@/components/customers/customer-row-actions";
import { CustomerTags } from "@/components/customers/source-chips";

const PAGE_SIZE = 50;

type SortKey = "newest" | "oldest" | "name_az" | "name_za";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "name_az", label: "Name A–Z" },
  { value: "name_za", label: "Name Z–A" },
];

/** Prefer QR form acceptance time; fall back to row creation. */
function signedUpAt(c: Customer): string | null {
  return c.termsAcceptedAt || c.createdAt || null;
}

export function CustomerTable({
  customers,
  total,
  canSeePii,
  canEdit = false,
  segments = [],
}: {
  customers: Customer[];
  /** Exact Postgres count — not `customers.length`. */
  total: number;
  canSeePii: boolean;
  canEdit?: boolean;
  segments?: SegmentDefinition[];
}) {
  const [q, setQ] = useState("");
  const [segment, setSegment] = useState("all");
  const [source, setSource] = useState<"all" | CustomerSource>("all");
  const [sort, setSort] = useState<SortKey>("newest");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const term = q.toLowerCase();
    const saved = segments.find((s) => s.id === segment);
    // One clock reading for the whole pass; rule matching is relative to "now"
    // and a per-row Date would also make the results inconsistent mid-filter.
    const now = new Date();

    const rows = customers.filter((c) => {
      const matchesTerm =
        !term ||
        c.name.toLowerCase().includes(term) ||
        c.phone.includes(term) ||
        c.waId.includes(term) ||
        (c.city?.toLowerCase().includes(term) ?? false);

      if (!matchesTerm) return false;
      if (!matchesCustomerSource(c, source)) return false;

      if (segment === "all") return true;
      if (saved) return customerMatchesRules(c, saved.rules, now);
      // Built-in legacy labels still stored on customers.segments
      return c.segments.includes(segment);
    });

    const signedMs = (c: Customer) => {
      const at = signedUpAt(c);
      return at ? new Date(at).getTime() : 0;
    };

    return rows.slice().sort((a, b) => {
      if (sort === "name_az") return a.name.localeCompare(b.name, "id", { sensitivity: "base" });
      if (sort === "name_za") return b.name.localeCompare(a.name, "id", { sensitivity: "base" });
      if (sort === "oldest") return signedMs(a) - signedMs(b);
      return signedMs(b) - signedMs(a);
    });
  }, [customers, q, segment, segments, sort, source]);

  const filtering = Boolean(q.trim()) || segment !== "all" || source !== "all";
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const visible = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 md:max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(0);
            }}
            placeholder="Search name, phone, city…"
            className="w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-3 text-sm outline-none focus:border-merlot"
          />
        </div>
        <Select
          value={segment}
          onChange={(next) => {
            setSegment(next);
            setPage(0);
          }}
          className="w-52"
          options={[
            { value: "all", label: "All customers" },
            ...(segments.length
              ? [{ label: "Saved segments", options: segments.map((s) => ({ value: s.id, label: s.name })) }]
              : []),
            {
              label: "Legacy labels",
              options: [
                { value: "VIP", label: "VIP" },
                { value: "Repeat", label: "Repeat" },
                { value: "New", label: "New" },
              ],
            },
          ]}
        />
        <Select
          value={source}
          onChange={(next) => {
            setSource(next as "all" | CustomerSource);
            setPage(0);
          }}
          className="w-40"
          options={[
            { value: "all", label: "All sources" },
            { value: "internal", label: "Internal" },
            { value: "voucher", label: "Voucher" },
          ]}
        />
        <Select
          value={sort}
          onChange={(next) => {
            setSort(next as SortKey);
            setPage(0);
          }}
          className="w-44"
          options={SORT_OPTIONS}
        />
        <Link
          href="/customers/segments"
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-merlot hover:bg-surface-muted"
        >
          Manage segments
        </Link>
        <span className="ml-auto text-xs text-muted">
          {filtering
            ? `${formatNumber(filtered.length)} of ${formatNumber(total)} customers`
            : `${formatNumber(total)} customers`}
        </span>
      </div>

      <Table>
        <thead>
          <tr>
            <Th>Customer</Th>
            <Th>Tags</Th>
            <Th>Consent</Th>
            <Th>Segments</Th>
            <Th>Signed up</Th>
            <Th>Discount</Th>
            <Th className="text-right">Orders</Th>
            <Th className="text-right">Lifetime value</Th>
            <Th>Last order</Th>
            {canEdit ? <Th className="text-right">Actions</Th> : null}
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
              <Td>
                <CustomerTags customer={c} />
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
              {canEdit ? (
                <Td className="text-right">
                  <CustomerRowActions customer={c} />
                </Td>
              ) : null}
            </tr>
            );
          })}
        </tbody>
      </Table>

      {pageCount > 1 && (
        <div className="mt-3 flex items-center justify-center gap-3 text-xs text-muted">
          <button
            type="button"
            disabled={safePage === 0}
            onClick={() => setPage(safePage - 1)}
            className="rounded-lg border border-border bg-surface px-2.5 py-1 text-foreground disabled:opacity-40"
          >
            Previous
          </button>
          <span>
            Page {formatNumber(safePage + 1)} of {formatNumber(pageCount)}
          </span>
          <button
            type="button"
            disabled={safePage >= pageCount - 1}
            onClick={() => setPage(safePage + 1)}
            className="rounded-lg border border-border bg-surface px-2.5 py-1 text-foreground disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

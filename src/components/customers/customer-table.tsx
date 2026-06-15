"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Avatar, Table, Th, Td } from "@/components/ui";
import { ConsentBadge } from "@/components/status";
import { formatIDRCompact, formatDate } from "@/lib/format";
import type { Customer } from "@/lib/types";

export function CustomerTable({
  customers,
  canSeePii,
}: {
  customers: Customer[];
  canSeePii: boolean;
}) {
  const [q, setQ] = useState("");
  const [segment, setSegment] = useState("all");

  const filtered = useMemo(() => {
    const term = q.toLowerCase();
    return customers.filter((c) => {
      const matchesTerm =
        !term ||
        c.name.toLowerCase().includes(term) ||
        c.phone.includes(term) ||
        c.waId.includes(term);
      const matchesSeg = segment === "all" || c.segments.includes(segment);
      return matchesTerm && matchesSeg;
    });
  }, [customers, q, segment]);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 md:max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, phone, wa_id…"
            className="w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-3 text-sm outline-none focus:border-merlot"
          />
        </div>
        <select
          value={segment}
          onChange={(e) => setSegment(e.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-merlot"
        >
          <option value="all">All segments</option>
          <option value="VIP">VIP</option>
          <option value="Repeat">Repeat</option>
          <option value="New">New</option>
        </select>
        <span className="ml-auto text-xs text-muted">{filtered.length} customers</span>
      </div>

      <Table>
        <thead>
          <tr>
            <Th>Customer</Th>
            <Th>Consent</Th>
            <Th>Segments</Th>
            <Th className="text-right">Orders</Th>
            <Th className="text-right">Lifetime value</Th>
            <Th>Last order</Th>
          </tr>
        </thead>
        <tbody>
          {filtered.slice(0, 100).map((c) => (
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
              <Td className="text-right text-sm">{c.orderCount}</Td>
              <Td className="text-right text-sm font-medium">{formatIDRCompact(c.lifetimeValue)}</Td>
              <Td className="text-sm text-muted">{c.lastOrderAt ? formatDate(c.lastOrderAt) : "—"}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}

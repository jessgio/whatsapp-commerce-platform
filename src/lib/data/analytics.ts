import "server-only";
import { shouldUseSupabaseData } from "@/lib/data/mode";
import {
  listCases,
  listConversations,
  listCustomers,
  listOrders,
  listProducts,
} from "@/lib/data/repo";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Conversation, Customer, Order, Product, SupportCase } from "@/lib/types";

export interface SalesMetrics {
  revenue30d: number;
  revenuePrev30d: number;
  revenueGrowthPct: number;
  orders30d: number;
  avgOrderValue: number;
  totalCustomers: number;
  newCustomers30d: number;
  repeatRatePct: number;
  retentionRatePct: number;
  paidConversionPct: number;
  revenueByDay: { date: string; value: number }[];
  topGrowing: { name: string; sku: string; growthPct: number; units: number }[];
  topDeclining: { name: string; sku: string; growthPct: number; units: number }[];
  revenueByCategory: { category: string; value: number }[];
}

export interface CsMetrics {
  activeCases: number;
  activeChats: number;
  unassignedChats: number;
  avgFirstResponseMin: number;
  resolvedToday: number;
  slaBreaches: number;
  byOwner: { name: string; open: number }[];
  byPriority: { priority: string; count: number }[];
}

const PRIORITIES = ["urgent", "high", "medium", "low"] as const;

function isWithinDays(iso: string, days: number): boolean {
  return Date.now() - new Date(iso).getTime() <= days * 86400000;
}

export function computeSalesMetrics(
  orders: Order[],
  customers: Customer[],
  products: Product[],
): SalesMetrics {
  const paid = orders.filter((o) => o.paymentStatus === "paid");
  const rev = (list: Order[]) => list.reduce((s, o) => s + o.total, 0);

  const last30 = paid.filter((o) => isWithinDays(o.createdAt, 30));
  const prev30 = paid.filter(
    (o) => !isWithinDays(o.createdAt, 30) && isWithinDays(o.createdAt, 60),
  );
  const revenue30d = rev(last30);
  const revenuePrev30d = rev(prev30) || 1;
  const revenueGrowthPct = ((revenue30d - revenuePrev30d) / revenuePrev30d) * 100;

  const newCustomers30d = customers.filter((c) => isWithinDays(c.createdAt, 30)).length;
  const repeatCustomers = customers.filter((c) => c.orderCount >= 2).length;
  const buyers = customers.filter((c) => c.orderCount >= 1).length || 1;

  // Retention: of the people who bought in the previous 30-day window, how many
  // bought again in the last 30 days.
  const priorBuyers = new Set(prev30.map((o) => o.customerId));
  const recentBuyers = new Set(last30.map((o) => o.customerId));
  let returned = 0;
  for (const id of priorBuyers) if (recentBuyers.has(id)) returned += 1;
  const retentionRatePct = priorBuyers.size
    ? (returned / priorBuyers.size) * 100
    : 0;

  const revenueByDay = Array.from({ length: 14 }, (_, i) => {
    const day = new Date(Date.now() - (13 - i) * 86400000);
    const key = day.toISOString().slice(0, 10);
    const value = paid
      .filter((o) => o.createdAt.slice(0, 10) === key)
      .reduce((s, o) => s + o.total, 0);
    return { date: key, value };
  });

  const withGrowth = products
    .map((p) => ({
      name: p.name,
      sku: p.sku,
      units: p.units30d,
      growthPct: p.unitsPrev30d
        ? ((p.units30d - p.unitsPrev30d) / p.unitsPrev30d) * 100
        : 0,
    }))
    .sort((a, b) => b.growthPct - a.growthPct);

  const catMap = new Map<string, number>();
  for (const o of paid) {
    for (const it of o.items) {
      const prod = products.find((p) => p.id === it.productId);
      const cat = prod?.category ?? "Other";
      catMap.set(cat, (catMap.get(cat) ?? 0) + it.qty * it.unitPrice);
    }
  }

  return {
    revenue30d,
    revenuePrev30d,
    revenueGrowthPct,
    orders30d: last30.length,
    avgOrderValue: last30.length ? Math.round(revenue30d / last30.length) : 0,
    totalCustomers: customers.length,
    newCustomers30d,
    repeatRatePct: (repeatCustomers / buyers) * 100,
    retentionRatePct,
    paidConversionPct: (paid.length / (orders.length || 1)) * 100,
    revenueByDay,
    topGrowing: withGrowth.slice(0, 4),
    topDeclining: withGrowth.slice(-4).reverse(),
    revenueByCategory: [...catMap.entries()]
      .map(([category, value]) => ({ category, value }))
      .sort((a, b) => b.value - a.value),
  };
}

const EMPTY_SALES_METRICS: SalesMetrics = {
  revenue30d: 0,
  revenuePrev30d: 0,
  revenueGrowthPct: 0,
  orders30d: 0,
  avgOrderValue: 0,
  totalCustomers: 0,
  newCustomers30d: 0,
  repeatRatePct: 0,
  retentionRatePct: 0,
  paidConversionPct: 0,
  revenueByDay: [],
  topGrowing: [],
  topDeclining: [],
  revenueByCategory: [],
};

const EMPTY_CS_METRICS: CsMetrics = {
  activeCases: 0,
  activeChats: 0,
  unassignedChats: 0,
  avgFirstResponseMin: 0,
  resolvedToday: 0,
  slaBreaches: 0,
  byOwner: [],
  byPriority: PRIORITIES.map((priority) => ({ priority, count: 0 })),
};

function num(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function rows<T>(value: unknown, map: (row: Record<string, unknown>) => T): T[] {
  if (!Array.isArray(value)) return [];
  return value.map((row) => map((row ?? {}) as Record<string, unknown>));
}

/**
 * Sales dashboard figures.
 *
 * Live mode aggregates in Postgres via the sales_metrics() function. Doing it
 * in JS meant fetching the 500 most recent orders with their line items, which
 * both made the page heavy and quietly capped every total once the store passed
 * 500 orders. Demo mode keeps the in-memory path since there is no database.
 */
export async function getSalesMetrics(): Promise<SalesMetrics> {
  if (!shouldUseSupabaseData()) {
    const [orders, customers, products] = await Promise.all([
      listOrders(),
      listCustomers(),
      listProducts(),
    ]);
    return computeSalesMetrics(orders, customers, products);
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("sales_metrics");
  if (error || !data) {
    console.error("[analytics] sales_metrics failed:", error?.message ?? "no data");
    return EMPTY_SALES_METRICS;
  }

  const m = data as Record<string, unknown>;
  return {
    revenue30d: num(m.revenue30d),
    revenuePrev30d: num(m.revenuePrev30d),
    revenueGrowthPct: num(m.revenueGrowthPct),
    orders30d: num(m.orders30d),
    avgOrderValue: num(m.avgOrderValue),
    totalCustomers: num(m.totalCustomers),
    newCustomers30d: num(m.newCustomers30d),
    repeatRatePct: num(m.repeatRatePct),
    retentionRatePct: num(m.retentionRatePct),
    paidConversionPct: num(m.paidConversionPct),
    revenueByDay: rows(m.revenueByDay, (r) => ({
      date: String(r.date ?? ""),
      value: num(r.value),
    })),
    topGrowing: rows(m.topGrowing, mapSkuGrowth),
    topDeclining: rows(m.topDeclining, mapSkuGrowth),
    revenueByCategory: rows(m.revenueByCategory, (r) => ({
      category: String(r.category ?? "Other"),
      value: num(r.value),
    })),
  };
}

function mapSkuGrowth(r: Record<string, unknown>) {
  return {
    name: String(r.name ?? ""),
    sku: String(r.sku ?? ""),
    growthPct: num(r.growthPct),
    units: num(r.units),
  };
}

export function computeCsMetrics(
  conversations: Conversation[],
  cases: SupportCase[],
): CsMetrics {
  const activeChats = conversations.filter((c) => c.status !== "resolved").length;
  const openCases = cases.filter((c) => c.status !== "resolved");
  const responded = conversations.filter((c) => c.firstResponseSeconds != null);
  const avgFirstResponseMin = responded.length
    ? responded.reduce((s, c) => s + (c.firstResponseSeconds ?? 0), 0) /
      responded.length /
      60
    : 0;

  const ownerMap = new Map<string, number>();
  for (const c of openCases) {
    const name = c.ownerName ?? "Unassigned";
    ownerMap.set(name, (ownerMap.get(name) ?? 0) + 1);
  }

  const prioMap = new Map<string, number>();
  for (const c of openCases) prioMap.set(c.priority, (prioMap.get(c.priority) ?? 0) + 1);

  // `cases` has no resolved_at column, so "today" is approximated by updatedAt.
  const today = new Date().toISOString().slice(0, 10);

  return {
    activeCases: openCases.length,
    activeChats,
    unassignedChats: conversations.filter((c) => !c.assigneeId && c.status !== "resolved").length,
    avgFirstResponseMin: Math.round(avgFirstResponseMin * 10) / 10,
    resolvedToday: cases.filter(
      (c) => c.status === "resolved" && c.updatedAt.slice(0, 10) === today,
    ).length,
    slaBreaches: conversations.filter(
      (c) => c.firstResponseSeconds != null && c.firstResponseSeconds > 600,
    ).length,
    byOwner: [...ownerMap.entries()].map(([name, open]) => ({ name, open })),
    byPriority: PRIORITIES.map((priority) => ({
      priority,
      count: prioMap.get(priority) ?? 0,
    })),
  };
}

/**
 * CS dashboard figures — aggregated in Postgres in live mode, in memory for
 * demo mode. The JS path reduced the 200 most recent conversations and cases,
 * which silently dropped older open work from every counter.
 */
export async function getCsMetrics(): Promise<CsMetrics> {
  if (!shouldUseSupabaseData()) {
    const [conversations, cases] = await Promise.all([
      listConversations(),
      listCases(),
    ]);
    return computeCsMetrics(conversations, cases);
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("cs_metrics");
  if (error || !data) {
    console.error("[analytics] cs_metrics failed:", error?.message ?? "no data");
    return EMPTY_CS_METRICS;
  }

  const m = data as Record<string, unknown>;
  const counts = new Map(
    rows(m.byPriority, (r) => [String(r.priority ?? ""), num(r.count)] as const),
  );
  return {
    activeCases: num(m.activeCases),
    activeChats: num(m.activeChats),
    unassignedChats: num(m.unassignedChats),
    avgFirstResponseMin: num(m.avgFirstResponseMin),
    resolvedToday: num(m.resolvedToday),
    slaBreaches: num(m.slaBreaches),
    byOwner: rows(m.byOwner, (r) => ({
      name: String(r.name ?? "Unassigned"),
      open: num(r.open),
    })),
    // Rebuilt from the fixed list so the chart always has all four bars.
    byPriority: PRIORITIES.map((priority) => ({
      priority,
      count: counts.get(priority) ?? 0,
    })),
  };
}

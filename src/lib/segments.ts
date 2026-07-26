import type { ConsentStatus, Customer } from "@/lib/types";

export type SegmentMatch = "all" | "any";

export type SegmentField =
  | "lifetime_value"
  | "order_count"
  | "last_order_at"
  | "city"
  | "age"
  | "consent_status"
  | "tag"
  | "legacy_segment";

export type SegmentOp =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "between"
  | "contains"
  | "not_contains"
  | "is_empty"
  | "is_not_empty"
  | "within_days"
  | "before_days"
  | "never";

export type SegmentCondition = {
  id: string;
  field: SegmentField;
  op: SegmentOp;
  value?: string | number | [number, number];
};

export type SegmentRules = {
  match: SegmentMatch;
  conditions: SegmentCondition[];
};

export type SegmentDefinition = {
  id: string;
  name: string;
  description: string | null;
  rules: SegmentRules;
  createdAt: string;
  updatedAt: string;
};

export const SEGMENT_FIELD_OPTIONS: Array<{
  value: SegmentField;
  label: string;
}> = [
  { value: "lifetime_value", label: "Lifetime value (IDR)" },
  { value: "order_count", label: "Order count" },
  { value: "last_order_at", label: "Last order date" },
  { value: "city", label: "City" },
  { value: "age", label: "Age (years)" },
  { value: "consent_status", label: "Consent status" },
  { value: "tag", label: "Tag" },
  { value: "legacy_segment", label: "Legacy segment label" },
];

export const OPS_BY_FIELD: Record<SegmentField, SegmentOp[]> = {
  lifetime_value: ["eq", "gte", "lte", "gt", "lt", "between"],
  order_count: ["eq", "gte", "lte", "gt", "lt", "between"],
  last_order_at: ["within_days", "before_days", "never", "is_not_empty"],
  city: ["contains", "eq", "is_empty", "is_not_empty"],
  age: ["eq", "gte", "lte", "between", "is_empty"],
  consent_status: ["eq", "neq"],
  tag: ["eq", "contains"],
  legacy_segment: ["eq", "contains"],
};

export const OP_LABELS: Record<SegmentOp, string> = {
  eq: "equals",
  neq: "does not equal",
  gt: "greater than",
  gte: "at least",
  lt: "less than",
  lte: "at most",
  between: "between",
  contains: "contains",
  not_contains: "does not contain",
  is_empty: "is empty",
  is_not_empty: "is not empty",
  within_days: "within last N days",
  before_days: "more than N days ago",
  never: "never ordered",
};

export function customerAgeYears(
  birthDate: string | null,
  now = new Date(),
): number | null {
  if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return null;
  const [y, m, d] = birthDate.split("-").map(Number);
  if (!y || !m || !d) return null;
  let age = now.getUTCFullYear() - y;
  const month = now.getUTCMonth() + 1;
  const day = now.getUTCDate();
  if (month < m || (month === m && day < d)) age -= 1;
  if (age < 0 || age > 120) return null;
  return age;
}

function asNumber(value: SegmentCondition["value"]): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function asRange(value: SegmentCondition["value"]): [number, number] | null {
  if (Array.isArray(value) && value.length === 2) {
    const a = Number(value[0]);
    const b = Number(value[1]);
    if (Number.isFinite(a) && Number.isFinite(b)) return [a, b];
  }
  return null;
}

function asString(value: SegmentCondition["value"]): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
}

function daysSince(iso: string | null, now: Date): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.floor((now.getTime() - t) / 86400000);
}

function matchCondition(
  customer: Customer,
  condition: SegmentCondition,
  now: Date,
): boolean {
  const { field, op } = condition;

  switch (field) {
    case "lifetime_value":
    case "order_count": {
      const actual =
        field === "lifetime_value" ? customer.lifetimeValue : customer.orderCount;
      if (op === "between") {
        const range = asRange(condition.value);
        if (!range) return false;
        const [lo, hi] = range[0] <= range[1] ? range : [range[1], range[0]];
        return actual >= lo && actual <= hi;
      }
      const n = asNumber(condition.value);
      if (n === null) return false;
      if (op === "eq") return actual === n;
      if (op === "gt") return actual > n;
      if (op === "gte") return actual >= n;
      if (op === "lt") return actual < n;
      if (op === "lte") return actual <= n;
      return false;
    }
    case "last_order_at": {
      if (op === "never" || op === "is_empty") return !customer.lastOrderAt;
      if (op === "is_not_empty") return Boolean(customer.lastOrderAt);
      const days = daysSince(customer.lastOrderAt, now);
      const n = asNumber(condition.value);
      if (days === null || n === null) return false;
      if (op === "within_days") return days <= n;
      if (op === "before_days") return days > n;
      return false;
    }
    case "city": {
      const city = customer.city?.trim() ?? "";
      if (op === "is_empty") return !city;
      if (op === "is_not_empty") return Boolean(city);
      const needle = asString(condition.value).trim().toLowerCase();
      if (!needle) return false;
      const hay = city.toLowerCase();
      if (op === "eq") return hay === needle;
      if (op === "contains") return hay.includes(needle);
      if (op === "not_contains") return !hay.includes(needle);
      return false;
    }
    case "age": {
      const age = customerAgeYears(customer.birthDate, now);
      if (op === "is_empty") return age === null;
      if (age === null) return false;
      if (op === "between") {
        const range = asRange(condition.value);
        if (!range) return false;
        const [lo, hi] = range[0] <= range[1] ? range : [range[1], range[0]];
        return age >= lo && age <= hi;
      }
      const n = asNumber(condition.value);
      if (n === null) return false;
      if (op === "eq") return age === n;
      if (op === "gte") return age >= n;
      if (op === "lte") return age <= n;
      if (op === "gt") return age > n;
      if (op === "lt") return age < n;
      return false;
    }
    case "consent_status": {
      const wanted = asString(condition.value) as ConsentStatus;
      if (op === "eq") return customer.consentStatus === wanted;
      if (op === "neq") return customer.consentStatus !== wanted;
      return false;
    }
    case "tag": {
      const needle = asString(condition.value).trim().toLowerCase();
      if (!needle) return false;
      const tags = customer.tags.map((t) => t.toLowerCase());
      if (op === "eq") return tags.includes(needle);
      if (op === "contains") return tags.some((t) => t.includes(needle));
      return false;
    }
    case "legacy_segment": {
      const needle = asString(condition.value).trim().toLowerCase();
      if (!needle) return false;
      const segs = customer.segments.map((s) => s.toLowerCase());
      if (op === "eq") return segs.includes(needle);
      if (op === "contains") return segs.some((s) => s.includes(needle));
      return false;
    }
    default:
      return false;
  }
}

export function customerMatchesRules(
  customer: Customer,
  rules: SegmentRules,
  now = new Date(),
): boolean {
  const conditions = rules.conditions ?? [];
  if (!conditions.length) return false;
  if (rules.match === "any") {
    return conditions.some((c) => matchCondition(customer, c, now));
  }
  return conditions.every((c) => matchCondition(customer, c, now));
}

export function filterCustomersByRules(
  customers: Customer[],
  rules: SegmentRules,
  now = new Date(),
): Customer[] {
  return customers.filter((c) => customerMatchesRules(c, rules, now));
}

export function newCondition(
  field: SegmentField = "lifetime_value",
): SegmentCondition {
  const op = OPS_BY_FIELD[field][0];
  const base: SegmentCondition = {
    id: `cond-${Math.random().toString(36).slice(2, 9)}`,
    field,
    op,
  };
  if (op === "between") base.value = [0, 0];
  else if (op === "never" || op === "is_empty" || op === "is_not_empty") {
    /* no value */
  } else if (field === "consent_status") base.value = "opted_in";
  else if (field === "city" || field === "tag" || field === "legacy_segment") {
    base.value = "";
  } else {
    base.value = 0;
  }
  return base;
}

export function emptyRules(): SegmentRules {
  return { match: "all", conditions: [newCondition("lifetime_value")] };
}

export function isSegmentRules(value: unknown): value is SegmentRules {
  if (!value || typeof value !== "object") return false;
  const v = value as SegmentRules;
  if (v.match !== "all" && v.match !== "any") return false;
  if (!Array.isArray(v.conditions)) return false;
  return v.conditions.every((c) => {
    if (!c || typeof c !== "object") return false;
    if (typeof c.id !== "string" || typeof c.field !== "string") return false;
    if (typeof c.op !== "string") return false;
    return (OPS_BY_FIELD[c.field as SegmentField] ?? []).includes(c.op as SegmentOp);
  });
}

export function summarizeCondition(c: SegmentCondition): string {
  const field =
    SEGMENT_FIELD_OPTIONS.find((f) => f.value === c.field)?.label ?? c.field;
  const op = OP_LABELS[c.op] ?? c.op;
  if (c.op === "never" || c.op === "is_empty" || c.op === "is_not_empty") {
    return `${field} ${op}`;
  }
  if (c.op === "between" && Array.isArray(c.value)) {
    return `${field} ${op} ${c.value[0]}–${c.value[1]}`;
  }
  return `${field} ${op} ${c.value ?? ""}`.trim();
}

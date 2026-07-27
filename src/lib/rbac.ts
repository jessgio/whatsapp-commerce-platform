import type { Role } from "./types";

export type Permission =
  | "dashboard.sales"
  | "dashboard.cs"
  | "inbox.view"
  | "inbox.reply"
  | "customers.view"
  | "customers.pii" // see full addresses / phone / email
  | "customers.edit"
  | "catalog.view"
  | "catalog.edit"
  | "orders.view"
  | "orders.edit"
  | "warehouse.view"
  | "warehouse.edit"
  | "shipments.view"
  | "shipments.edit"
  | "cases.view"
  | "cases.edit"
  | "marketing.view"
  | "marketing.edit"
  | "marketing.send"
  | "account.view"
  | "settings.manage";

const ALL: Permission[] = [
  "dashboard.sales",
  "dashboard.cs",
  "inbox.view",
  "inbox.reply",
  "customers.view",
  "customers.pii",
  "customers.edit",
  "catalog.view",
  "catalog.edit",
  "orders.view",
  "orders.edit",
  "warehouse.view",
  "warehouse.edit",
  "shipments.view",
  "shipments.edit",
  "cases.view",
  "cases.edit",
  "marketing.view",
  "marketing.edit",
  "marketing.send",
  "account.view",
  "settings.manage",
];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: ALL,
  sales: [
    "dashboard.sales",
    "inbox.view",
    "inbox.reply",
    "customers.view",
    "customers.pii",
    "customers.edit",
    "catalog.view",
    "catalog.edit",
    "orders.view",
    "orders.edit",
    "shipments.view",
    "cases.view",
    "cases.edit",
    "marketing.view",
    "marketing.edit",
    "marketing.send",
    "account.view",
  ],
  cs: [
    "dashboard.cs",
    "inbox.view",
    "inbox.reply",
    "customers.view",
    "customers.pii",
    "orders.view",
    "shipments.view",
    "cases.view",
    "cases.edit",
    "marketing.view",
    "account.view",
  ],
  warehouse: [
    "orders.view",
    "warehouse.view",
    "warehouse.edit",
    "shipments.view",
    "shipments.edit",
    "catalog.view",
    "account.view",
  ],
};

export function can(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/**
 * Landing page per role, paired with the permission that page enforces. The
 * pairing is what keeps `homePathForRole` loop-free: if a role ever loses the
 * permission its home requires, it falls back to `/account`, which every role
 * can reach.
 */
const ROLE_HOME: Record<Role, { path: string; permission: Permission }> = {
  admin: { path: "/dashboard", permission: "dashboard.sales" },
  sales: { path: "/dashboard", permission: "dashboard.sales" },
  cs: { path: "/cs-dashboard", permission: "dashboard.cs" },
  warehouse: { path: "/warehouse", permission: "warehouse.view" },
};

/** Where to send `role` when they land on `/` or are denied a route. */
export function homePathForRole(role: Role): string {
  const home = ROLE_HOME[role];
  return home && can(role, home.permission) ? home.path : "/account";
}

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrator",
  sales: "Sales",
  cs: "Customer Service",
  warehouse: "Warehouse",
};

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

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrator",
  sales: "Sales",
  cs: "Customer Service",
  warehouse: "Warehouse",
};

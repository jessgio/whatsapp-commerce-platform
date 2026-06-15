import type { Permission } from "@/lib/rbac";

export interface NavItem {
  href: string;
  label: string;
  icon: string; // lucide icon name
  permission: Permission;
  group: "Overview" | "Engage" | "Commerce" | "Operations";
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Sales Dashboard", icon: "LayoutDashboard", permission: "dashboard.sales", group: "Overview" },
  { href: "/cs-dashboard", label: "CS Dashboard", icon: "Headset", permission: "dashboard.cs", group: "Overview" },
  { href: "/inbox", label: "Inbox", icon: "MessagesSquare", permission: "inbox.view", group: "Engage" },
  { href: "/customers", label: "Customers", icon: "Users", permission: "customers.view", group: "Engage" },
  { href: "/cases", label: "Cases", icon: "TicketCheck", permission: "cases.view", group: "Engage" },
  { href: "/catalog", label: "Catalog & Pricing", icon: "Tags", permission: "catalog.view", group: "Commerce" },
  { href: "/orders", label: "Orders", icon: "ShoppingBag", permission: "orders.view", group: "Commerce" },
  { href: "/warehouse", label: "Warehouse", icon: "Warehouse", permission: "warehouse.view", group: "Operations" },
  { href: "/warehouse/pack", label: "Pack Station", icon: "ScanLine", permission: "warehouse.view", group: "Operations" },
  { href: "/shipments", label: "Shipments", icon: "Truck", permission: "shipments.view", group: "Operations" },
  { href: "/account", label: "Account", icon: "UserCircle", permission: "account.view", group: "Overview" },
  { href: "/settings", label: "Settings", icon: "Settings", permission: "settings.manage", group: "Operations" },
];

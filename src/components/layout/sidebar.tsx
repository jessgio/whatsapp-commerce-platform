"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Headset,
  Layers,
  LayoutDashboard,
  Megaphone,
  MessagesSquare,
  Palette,
  ScanLine,
  Settings,
  ShoppingBag,
  Tags,
  TicketCheck,
  Truck,
  UserCircle,
  Users,
  Warehouse,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { NavItem } from "./nav-config";

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  Headset,
  MessagesSquare,
  Users,
  Layers,
  TicketCheck,
  Palette,
  Megaphone,
  Tags,
  ShoppingBag,
  Warehouse,
  ScanLine,
  Truck,
  UserCircle,
  Settings,
};

const GROUPS: NavItem["group"][] = [
  "Overview",
  "Engage",
  "Marketing",
  "Commerce",
  "Operations",
];

export function Sidebar({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  // Pick the single most-specific matching route (longest href prefix).
  const activeHref = items
    .filter((i) => pathname === i.href || pathname.startsWith(i.href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <aside className="hidden w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <Image
          src="/brand/aeris-mark.png"
          alt="Aeris Beauté"
          width={32}
          height={32}
          className="h-8 w-8 shrink-0 object-contain invert"
          priority
        />
        <div className="leading-tight">
          <div className="text-sm font-semibold text-cream">Aeris Beaute</div>
          <div className="text-[11px] text-taupe">Commerce Platform</div>
        </div>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-2">
        {GROUPS.map((group) => {
          const groupItems = items.filter((i) => i.group === group);
          if (!groupItems.length) return null;
          return (
            <div key={group}>
              <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-brown">
                {group}
              </p>
              <div className="space-y-0.5">
                {groupItems.map((item) => {
                  const Icon = ICONS[item.icon] ?? LayoutDashboard;
                  const active = item.href === activeHref;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
                        active
                          ? "bg-sidebar-active text-primary-foreground"
                          : "text-sidebar-foreground/80 hover:bg-white/5 hover:text-cream",
                      )}
                    >
                      <Icon size={17} strokeWidth={2} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="px-4 py-3 text-[11px] text-brown">v0.1 · Internal use</div>
    </aside>
  );
}

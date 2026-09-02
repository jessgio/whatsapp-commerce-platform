"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Headset,
  Layers,
  LayoutDashboard,
  Megaphone,
  Menu,
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
  X,
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

export function MobileNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  // Store the route the drawer was opened on rather than a boolean, so any
  // navigation closes it without an effect that re-renders on every route change.
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const open = openedOn === pathname;

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const activeHref = items
    .filter((i) => pathname === i.href || pathname.startsWith(i.href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpenedOn(pathname)}
        className="rounded-lg p-2 text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
        aria-label="Open navigation"
      >
        <Menu size={20} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close navigation"
            onClick={() => setOpenedOn(null)}
          />
          <aside className="relative z-10 flex h-full w-[min(18rem,85vw)] flex-col bg-sidebar text-sidebar-foreground shadow-xl">
            <div className="flex items-center justify-between gap-2 px-4 py-4">
              <div className="flex items-center gap-2.5">
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
              <button
                type="button"
                onClick={() => setOpenedOn(null)}
                className="rounded-lg p-2 text-sidebar-foreground/70 hover:bg-white/5 hover:text-cream"
                aria-label="Close navigation"
              >
                <X size={18} />
              </button>
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
          </aside>
        </div>
      )}
    </div>
  );
}

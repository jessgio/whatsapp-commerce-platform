import * as React from "react";
import { cn, initials } from "@/lib/utils";

/* ---------- Card ---------- */

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[14px] border border-border bg-surface shadow-[0_1px_2px_rgba(45,43,42,0.04)]",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-center justify-between gap-3 px-5 pt-4", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-sm font-semibold text-foreground", className)} {...props} />;
}

export function CardBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5", className)} {...props} />;
}

/* ---------- Badge ---------- */

const BADGE_TONES: Record<string, string> = {
  neutral: "bg-beige-200 text-brown",
  merlot: "bg-merlot/10 text-merlot",
  success: "bg-success/12 text-success",
  warning: "bg-warning/15 text-warning",
  danger: "bg-danger/12 text-danger",
  info: "bg-info/12 text-info",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: keyof typeof BADGE_TONES }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        BADGE_TONES[tone],
        className,
      )}
      {...props}
    />
  );
}

/* ---------- Button ---------- */

const BTN: Record<string, string> = {
  primary: "bg-primary text-primary-foreground hover:bg-merlot-600",
  secondary: "bg-surface border border-border text-foreground hover:bg-surface-muted",
  ghost: "text-foreground hover:bg-surface-muted",
  danger: "bg-danger text-white hover:opacity-90",
};

export function Button({
  variant = "primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof BTN }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none",
        BTN[variant],
        className,
      )}
      {...props}
    />
  );
}

/* ---------- Avatar ---------- */

export function Avatar({
  name,
  color = "#6f2c3f",
  size = 32,
}: {
  name: string;
  color?: string;
  size?: number;
}) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{ width: size, height: size, background: color, fontSize: size * 0.36 }}
    >
      {initials(name)}
    </span>
  );
}

/* ---------- Page header ---------- */

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ---------- Stat card ---------- */

export function StatCard({
  label,
  value,
  delta,
  hint,
  icon,
}: {
  label: string;
  value: string;
  delta?: number;
  hint?: string;
  icon?: React.ReactNode;
}) {
  const up = (delta ?? 0) >= 0;
  return (
    <Card className="animate-fade-in">
      <CardBody className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-muted">{label}</span>
          {icon && <span className="text-taupe">{icon}</span>}
        </div>
        <div className="text-2xl font-semibold text-foreground">{value}</div>
        <div className="flex items-center gap-2 text-xs">
          {delta !== undefined && (
            <span className={cn("font-medium", up ? "text-success" : "text-danger")}>
              {up ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}%
            </span>
          )}
          {hint && <span className="text-muted">{hint}</span>}
        </div>
      </CardBody>
    </Card>
  );
}

/* ---------- Empty state ---------- */

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[14px] border border-dashed border-border bg-surface-muted px-6 py-12 text-center">
      <p className="text-sm font-medium text-foreground">{title}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

/* ---------- Table primitives ---------- */

export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-[14px] border border-border bg-surface">
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

export function Th({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "border-b border-border px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted",
        className,
      )}
      {...props}
    />
  );
}

export function Td({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("border-b border-border/60 px-4 py-3 align-middle", className)} {...props} />;
}

export { Select, type SelectOption, type SelectGroup } from "./select";

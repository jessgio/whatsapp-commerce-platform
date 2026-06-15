const IDR = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const NUM = new Intl.NumberFormat("id-ID");

export function formatIDR(amount: number): string {
  return IDR.format(amount ?? 0);
}

export function formatIDRCompact(amount: number): string {
  if (Math.abs(amount) >= 1_000_000_000)
    return `Rp ${(amount / 1_000_000_000).toFixed(1)}M`;
  if (Math.abs(amount) >= 1_000_000)
    return `Rp ${(amount / 1_000_000).toFixed(1)}jt`;
  if (Math.abs(amount) >= 1_000) return `Rp ${(amount / 1_000).toFixed(0)}rb`;
  return `Rp ${amount}`;
}

export function formatNumber(n: number): string {
  return NUM.format(n ?? 0);
}

export function formatPercent(n: number, digits = 1): string {
  return `${n >= 0 ? "" : ""}${n.toFixed(digits)}%`;
}

export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function timeAgo(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(d);
}

/** Minutes remaining in the WhatsApp 24h customer-service window. */
export function windowMinutesLeft(lastInboundAt: string | Date | null): number {
  if (!lastInboundAt) return 0;
  const d =
    typeof lastInboundAt === "string"
      ? new Date(lastInboundAt)
      : lastInboundAt;
  const elapsedMin = (Date.now() - d.getTime()) / 60000;
  return Math.max(0, Math.round(24 * 60 - elapsedMin));
}

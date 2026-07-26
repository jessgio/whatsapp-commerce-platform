"use client";

import dynamic from "next/dynamic";

function ChartSkeleton({ height = 220 }: { height?: number }) {
  return (
    <div
      className="animate-pulse rounded-lg bg-beige-200/40"
      style={{ height }}
      aria-hidden
    />
  );
}

/** Lazy recharts islands — keep dashboard route JS smaller until charts paint. */
export const RevenueTrend = dynamic(
  () => import("@/components/charts").then((m) => m.RevenueTrend),
  { loading: () => <ChartSkeleton height={220} />, ssr: false },
);

export const CategoryBars = dynamic(
  () => import("@/components/charts").then((m) => m.CategoryBars),
  { loading: () => <ChartSkeleton height={220} />, ssr: false },
);

export const MiniBars = dynamic(
  () => import("@/components/charts").then((m) => m.MiniBars),
  { loading: () => <ChartSkeleton height={180} />, ssr: false },
);

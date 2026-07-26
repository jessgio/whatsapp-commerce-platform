"use client";

import { useRouter } from "next/navigation";
import { startTransition, useEffect, useRef } from "react";

/**
 * Soft-refresh inbox RSC data on an interval; pauses while the tab is hidden.
 * Uses startTransition so refreshes don't block pointer/keyboard interactions.
 */
export function InboxAutoRefresh({ intervalMs = 30_000 }: { intervalMs?: number }) {
  const router = useRouter();
  const lastRefreshAt = useRef(0);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;

    const refresh = (force = false) => {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      // Avoid a double refresh when the tab becomes visible right after an interval tick.
      if (!force && now - lastRefreshAt.current < intervalMs * 0.8) return;
      lastRefreshAt.current = now;
      startTransition(() => {
        router.refresh();
      });
    };

    const start = () => {
      if (timer) return;
      timer = setInterval(() => refresh(), intervalMs);
    };

    const stop = () => {
      if (!timer) return;
      clearInterval(timer);
      timer = undefined;
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        refresh(true);
        start();
      } else {
        stop();
      }
    };

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [router, intervalMs]);

  return null;
}

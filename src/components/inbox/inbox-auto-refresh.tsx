"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Soft-refresh inbox RSC data on an interval; pauses while the tab is hidden. */
export function InboxAutoRefresh({ intervalMs = 10_000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;

    const refresh = () => {
      if (document.visibilityState === "visible") router.refresh();
    };

    const start = () => {
      if (timer) return;
      timer = setInterval(refresh, intervalMs);
    };

    const stop = () => {
      if (!timer) return;
      clearInterval(timer);
      timer = undefined;
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        refresh();
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

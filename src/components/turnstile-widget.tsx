"use client";

import { useEffect, useRef, useState } from "react";
import { publicTurnstileSiteKey } from "@/lib/turnstile";

const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type TurnstileApi = {
  render: (
    el: HTMLElement,
    opts: {
      sitekey: string;
      callback?: (token: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: () => void;
      theme?: "light" | "dark" | "auto";
      size?: "normal" | "compact" | "flexible";
      appearance?: "always" | "execute" | "interaction-only";
      language?: string;
    },
  ) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

function ensureTurnstileScript() {
  if (document.querySelector(`script[data-aeris-turnstile="1"]`)) return;
  const s = document.createElement("script");
  s.src = SCRIPT_SRC;
  s.async = true;
  s.defer = true;
  s.dataset.aerisTurnstile = "1";
  document.head.appendChild(s);
}

export function TurnstileWidget({
  onToken,
  theme = "light",
}: {
  onToken: (token: string | null) => void;
  theme?: "light" | "dark" | "auto";
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    ensureTurnstileScript();
    let cancelled = false;
    const started = Date.now();

    const timer = window.setInterval(() => {
      if (cancelled) return;
      const api = window.turnstile;
      const el = hostRef.current;
      if (!api || !el) {
        if (Date.now() - started > 12000) {
          window.clearInterval(timer);
          setStatus("error");
        }
        return;
      }
      window.clearInterval(timer);
      if (widgetIdRef.current) return;

      const sitekey = publicTurnstileSiteKey();
      if (!sitekey) {
        setStatus("error");
        onTokenRef.current(null);
        return;
      }

      try {
        widgetIdRef.current = api.render(el, {
          sitekey,
          theme,
          size: "flexible",
          appearance: "always",
          language: "id",
          callback: (token) => onTokenRef.current(token),
          "expired-callback": () => onTokenRef.current(null),
          "error-callback": () => onTokenRef.current(null),
        });
        setStatus("ready");
      } catch (e) {
        console.error("[turnstile] render failed", e);
        setStatus("error");
        onTokenRef.current(null);
      }
    }, 50);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [theme]);

  return (
    <div className="w-full space-y-1.5">
      <p className="text-xs font-medium text-muted">Verifikasi keamanan</p>
      {status === "loading" ? (
        <p className="text-xs text-muted">Memuat widget…</p>
      ) : null}
      {status === "error" ? (
        <p className="text-xs text-danger">
          Widget gagal dimuat. Matikan pemblokir iklan, lalu muat ulang halaman.
        </p>
      ) : null}
      <div
        ref={hostRef}
        className="w-full min-h-[65px] [&_iframe]:!w-full [&_iframe]:max-w-none"
      />
    </div>
  );
}

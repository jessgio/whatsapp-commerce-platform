/**
 * Cloudflare Turnstile helpers that are safe to import from client components.
 * Dummy keys are Cloudflare’s documented always-pass test pair:
 * https://developers.cloudflare.com/turnstile/troubleshooting/testing/
 */
export const TURNSTILE_DUMMY_SITE_KEY = "1x00000000000000000000AA";
/** Documented dummy secret — always passes. Not a production credential. */
export const TURNSTILE_DUMMY_SECRET_KEY =
  "1x0000000000000000000000000000000AA";

export function isLocalTurnstileHost(host: string | null | undefined): boolean {
  if (!host) return false;
  let h = host.trim().toLowerCase();
  if (h.startsWith("[")) {
    const end = h.indexOf("]");
    h = end >= 0 ? h.slice(1, end) : h;
  } else {
    h = h.split(":")[0] ?? h;
  }
  return h === "localhost" || h === "127.0.0.1" || h === "::1" || h === "0.0.0.0";
}

/**
 * Dummy keys on `next dev`, and on local `next start` (not Vercel).
 * Production / Vercel always uses the real widget unless explicitly overridden.
 */
export function shouldUseTurnstileTestKeys(host?: string | null): boolean {
  if (process.env.TURNSTILE_USE_TEST_KEYS === "true") return true;
  if (process.env.TURNSTILE_USE_TEST_KEYS === "false") return false;
  if (process.env.NODE_ENV !== "production") return true;
  if (!process.env.VERCEL && isLocalTurnstileHost(host)) return true;
  return false;
}

export function publicTurnstileSiteKey(host?: string | null): string {
  const resolvedHost =
    host ??
    (typeof window !== "undefined" ? window.location.hostname : null);
  if (shouldUseTurnstileTestKeys(resolvedHost)) return TURNSTILE_DUMMY_SITE_KEY;
  return process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
}

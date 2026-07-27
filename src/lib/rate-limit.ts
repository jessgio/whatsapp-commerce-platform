import "server-only";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export interface RateLimitRule {
  /** Distinguishes one endpoint's budget from another's for the same caller. */
  scope: string;
  limit: number;
  windowSeconds: number;
}

export interface RateLimitVerdict {
  allowed: boolean;
  retryAfterSeconds: number;
}

/**
 * Best-effort caller identity. Vercel sets `x-forwarded-for`; the leftmost entry
 * is the client. Callers behind the same NAT share a budget, which is the usual
 * trade-off for IP-based limiting.
 */
export function clientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  return first || req.headers.get("x-real-ip") || "unknown";
}

/**
 * Counts one request against a shared fixed window in Postgres (see migration
 * 0019). Fails open: a broken counter should slow nobody down, so failures are
 * logged and the request proceeds.
 */
export async function consumeRateLimit(
  identifier: string,
  rule: RateLimitRule,
): Promise<RateLimitVerdict> {
  // Demo mode has no database and nothing worth protecting.
  if (!isSupabaseConfigured()) return { allowed: true, retryAfterSeconds: 0 };

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .rpc("consume_rate_limit", {
        p_key: `${rule.scope}:${identifier}`,
        p_limit: rule.limit,
        p_window_seconds: rule.windowSeconds,
      })
      .maybeSingle<{ allowed: boolean; remaining: number; reset_at: string }>();

    if (error || !data) {
      console.error("[rate-limit] check failed", error);
      return { allowed: true, retryAfterSeconds: 0 };
    }

    const resetMs = new Date(data.reset_at).getTime() - Date.now();
    return {
      allowed: data.allowed,
      retryAfterSeconds: Math.max(1, Math.ceil(resetMs / 1000)),
    };
  } catch (e) {
    console.error("[rate-limit] check threw", e);
    return { allowed: true, retryAfterSeconds: 0 };
  }
}

/**
 * Applies `rule` to the request's client IP. Returns a 429 response to return
 * immediately, or null when the caller is within budget.
 */
export async function enforceRateLimit(
  req: NextRequest,
  rule: RateLimitRule,
  message = "Terlalu banyak permintaan. Coba lagi sebentar.",
): Promise<NextResponse | null> {
  const verdict = await consumeRateLimit(clientIp(req), rule);
  if (verdict.allowed) return null;

  return NextResponse.json(
    { ok: false, error: message },
    { status: 429, headers: { "Retry-After": String(verdict.retryAfterSeconds) } },
  );
}

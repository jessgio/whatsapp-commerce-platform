import "server-only";
import type { Customer } from "@/lib/types";

export function apiBaseUrl(): string | null {
  const url = process.env.API_URL?.trim();
  return url ? url.replace(/\/$/, "") : null;
}

function apiHeaders(): HeadersInit | null {
  const secret = process.env.API_SECRET?.trim();
  const base = apiBaseUrl();
  if (!base || !secret) return null;
  return { "x-api-key": secret };
}

export async function listCustomersFromApi(): Promise<Customer[] | null> {
  const headers = apiHeaders();
  const base = apiBaseUrl();
  if (!headers || !base) return null;
  try {
    const res = await fetch(`${base}/customers`, {
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(2_500),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { customers?: Customer[] };
    return Array.isArray(body.customers) ? body.customers : null;
  } catch (err) {
    console.warn("[api] listCustomers fallback to Next", err);
    return null;
  }
}

export async function exportCustomersFromApi(
  source: string,
): Promise<Response | null> {
  const headers = apiHeaders();
  const base = apiBaseUrl();
  if (!headers || !base) return null;
  try {
    const res = await fetch(
      `${base}/customers/export?source=${encodeURIComponent(source)}`,
      {
        headers,
        cache: "no-store",
        signal: AbortSignal.timeout(30_000),
      },
    );
    if (!res.ok) return null;
    return res;
  } catch (err) {
    console.warn("[api] exportCustomers fallback to Next", err);
    return null;
  }
}

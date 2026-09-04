import "server-only";
import type { NextRequest } from "next/server";
import { headers } from "next/headers";
import {
  TURNSTILE_DUMMY_SECRET_KEY,
  shouldUseTurnstileTestKeys,
} from "@/lib/turnstile";

const SITEVERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

function hostFromHeaders(headerStore: Headers): string {
  return headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "";
}

function ipFromHeaders(headerStore: Headers): string {
  return (
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headerStore.get("x-real-ip") ||
    ""
  );
}

function turnstileSecret(host: string): string {
  if (shouldUseTurnstileTestKeys(host)) return TURNSTILE_DUMMY_SECRET_KEY;
  return process.env.TURNSTILE_SECRET_KEY ?? "";
}

export async function verifyTurnstileResponse(
  token: string | null | undefined,
  host: string,
  ip = "",
): Promise<{ ok: true } | { ok: false; error: string }> {
  const secret = turnstileSecret(host);
  if (!secret) {
    console.error("[turnstile] TURNSTILE_SECRET_KEY is not set");
    return {
      ok: false,
      error: "Verifikasi tidak tersedia. Coba lagi nanti.",
    };
  }

  const response = token?.trim() ?? "";
  if (!response) {
    return {
      ok: false,
      error: "Selesaikan verifikasi keamanan dulu.",
    };
  }

  const body = new URLSearchParams();
  body.set("secret", secret);
  body.set("response", response);
  if (ip) body.set("remoteip", ip);

  try {
    const res = await fetch(SITEVERIFY, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const data = (await res.json()) as {
      success?: boolean;
      "error-codes"?: string[];
    };
    if (!data.success) {
      console.warn("[turnstile] siteverify failed", data["error-codes"]);
      return {
        ok: false,
        error: "Verifikasi keamanan gagal. Muat ulang halaman dan coba lagi.",
      };
    }
    return { ok: true };
  } catch (e) {
    console.error("[turnstile] siteverify error", e);
    return {
      ok: false,
      error: "Verifikasi keamanan gagal. Coba lagi.",
    };
  }
}

export async function verifyTurnstileToken(
  req: NextRequest,
  token: string | null | undefined,
): Promise<{ ok: true } | { ok: false; error: string }> {
  return verifyTurnstileResponse(
    token,
    hostFromHeaders(req.headers),
    ipFromHeaders(req.headers),
  );
}

export async function verifyTurnstileFormData(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const headerStore = await headers();
  const token = String(
    formData.get("turnstileToken") ??
      formData.get("cf-turnstile-response") ??
      "",
  );
  return verifyTurnstileResponse(
    token,
    hostFromHeaders(headerStore),
    ipFromHeaders(headerStore),
  );
}

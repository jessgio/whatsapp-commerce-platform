import { randomBytes } from "node:crypto";

/** Unguessable token for public profile-edit links. */
export function newEditToken(): string {
  return randomBytes(24).toString("base64url");
}

/**
 * Public origin for QR / edit links.
 * Prefer PUBLIC_FORM_BASE_URL; falls back to join.aerisbeaute.com.
 */
export function publicFormBaseUrl(): string {
  const fromEnv = process.env.PUBLIC_FORM_BASE_URL?.trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  return "https://join.aerisbeaute.com";
}

export function leadEditUrl(editToken: string): string {
  const url = new URL("/daftar/edit", publicFormBaseUrl());
  url.searchParams.set("token", editToken);
  return url.toString();
}

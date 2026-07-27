import "server-only";
import { createHmac, timingSafeEqual } from "crypto";

/**
 * Constant-time string comparison for webhook secrets and signatures. Falls
 * back to a plain inequality when lengths differ, since `timingSafeEqual`
 * throws on mismatched buffers and the length is not the secret.
 */
export function safeEqual(a: string, b: string): boolean {
  if (!a || !b) return false;
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/**
 * Verifies a `sha256=<hex>` HMAC header (Meta's `X-Hub-Signature-256` format)
 * against the raw request body. The body must be the exact bytes received —
 * re-serialising parsed JSON will not reproduce the signature.
 */
export function verifyHmacSha256(
  rawBody: string,
  header: string | null,
  secret: string,
): boolean {
  if (!header || !secret) return false;
  const provided = header.startsWith("sha256=") ? header.slice(7) : header;
  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  return safeEqual(provided, expected);
}

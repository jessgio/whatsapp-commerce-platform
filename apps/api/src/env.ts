export function corsOrigins(): string[] | true {
  const raw = process.env.CORS_ORIGINS?.trim();
  if (!raw) return true;
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function customersCacheTtl(): number {
  const n = Number(process.env.CUSTOMERS_CACHE_TTL ?? 60);
  return Number.isFinite(n) && n > 0 ? n : 60;
}

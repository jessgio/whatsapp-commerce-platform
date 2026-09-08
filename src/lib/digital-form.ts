import { QR_LEAD_FORM_TEMPLATE_ID } from "@/lib/form-templates";

/** Short unique id used in public `/f/[slug]` links. */
export function newPublicFormSlug(): string {
  return `fd${Math.random().toString(36).slice(2, 10)}`;
}

export function isDigitalForm(template: { id: string; kind: string }): boolean {
  return template.kind !== "system" && template.id !== QR_LEAD_FORM_TEMPLATE_ID;
}

export function digitalFormPath(slug: string): string {
  return `/f/${encodeURIComponent(slug)}`;
}

export function digitalFormUrl(baseUrl: string, slug: string): string {
  return `${baseUrl.replace(/\/$/, "")}${digitalFormPath(slug)}`;
}

export function jakartaDateFromIso(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(d);
}

/** YYYY-MM-DD today in Asia/Jakarta. */
export function jakartaToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(
    new Date(),
  );
}

/** Add calendar days to a YYYY-MM-DD civil date. */
export function jakartaPlusDays(days: number, from = jakartaToday()): string {
  const [y, m, d] = from.split("-").map(Number);
  if (!y || !m || !d) return from;
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  const yyyy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/** End of the given YYYY-MM-DD in Asia/Jakarta. */
export function jakartaEndOfDayIso(isoDate: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return null;
  const d = new Date(`${isoDate}T23:59:59.999+07:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function isFormExpired(
  expiresAt: string | null | undefined,
  now = new Date(),
): boolean {
  if (!expiresAt) return false;
  const t = new Date(expiresAt).getTime();
  if (Number.isNaN(t)) return false;
  return now.getTime() > t;
}

export function isPublicSlug(value: string): boolean {
  return /^fd[a-z0-9]{6,16}$/i.test(value);
}

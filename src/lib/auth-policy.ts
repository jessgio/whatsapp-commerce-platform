/** Staff self-registration is limited to this email domain. */
export const STAFF_EMAIL_DOMAIN = "aerisbeaute.com";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isAllowedStaffEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  if (!EMAIL_RE.test(normalized)) return false;
  const [, domain] = normalized.split("@");
  return domain === STAFF_EMAIL_DOMAIN;
}

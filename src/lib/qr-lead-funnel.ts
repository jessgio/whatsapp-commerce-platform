import {
  LEAD_WELCOME_TEMPLATE_ID,
} from "@/lib/email-templates";
import { QR_LEAD_FORM_TEMPLATE_ID } from "@/lib/form-templates";

/** Hard-wired QR signup funnel: form → thank-you → welcome email. */
export const QR_LEAD_FUNNEL = {
  formId: QR_LEAD_FORM_TEMPLATE_ID,
  emailId: LEAD_WELCOME_TEMPLATE_ID,
  formPath: `/marketing/design/form/${QR_LEAD_FORM_TEMPLATE_ID}`,
  emailPath: `/marketing/design/email/${LEAD_WELCOME_TEMPLATE_ID}`,
  publicFormPath: "/daftar",
  thankYouPath: "/daftar/terima-kasih",
  label: "QR lead funnel",
  shortDescription:
    "Form, thank-you page, and welcome email sent after someone joins via QR.",
  discountSourceHint:
    "Fisik card code. Same phone keeps the first fisik code after you rotate it. Form Digital issues a separate digital code.",
  funnelBanner:
    "This QR lead funnel powers /daftar, the thank-you page, and the automatic welcome email. Edit the discount code only on the Form tab.",
  welcomeBanner:
    "Sent automatically after the QR lead form. The discount code is set on the form — not on this email.",
} as const;

export function isQrLeadForm(id: string): boolean {
  return id === QR_LEAD_FUNNEL.formId;
}

export function isQrLeadWelcomeEmail(id: string): boolean {
  return id === QR_LEAD_FUNNEL.emailId;
}

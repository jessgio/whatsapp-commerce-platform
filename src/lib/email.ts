import { Resend } from "resend";
import { LeadWelcomeEmail } from "@/emails/lead-welcome";
import { getLeadWelcomeTemplateAdmin } from "@/lib/data/email-templates";
import { applyTemplateVars } from "@/lib/email-templates";
import { leadEditUrl } from "@/lib/lead-edit";
import { LEAD_DISCOUNT_CODE } from "@/lib/lead-offer";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

function fromAddress(): string {
  return (
    process.env.EMAIL_FROM?.trim() ||
    "Aeris Beauté <onboarding@resend.dev>"
  );
}

/** Sends the QR-lead welcome email with discount code. Failures are logged, not thrown. */
export async function sendLeadWelcomeEmail(input: {
  to: string;
  name: string;
  editToken: string;
  discountCode?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const resend = getResend();
  if (!resend) {
    console.warn("[email] RESEND_API_KEY missing — skipped lead welcome email");
    return { ok: false, error: "missing_api_key" };
  }

  try {
    const template = await getLeadWelcomeTemplateAdmin();
    const discountCode = input.discountCode ?? LEAD_DISCOUNT_CODE;
    const editUrl = leadEditUrl(input.editToken);
    const vars = { name: input.name, editUrl };
    const subject = applyTemplateVars(template.subject, vars);

    const { error } = await resend.emails.send({
      from: fromAddress(),
      to: input.to,
      subject,
      react: LeadWelcomeEmail({
        name: input.name,
        discountCode,
        template,
        editUrl,
      }),
    });

    if (error) {
      console.error("[email] lead welcome failed", error);
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (e) {
    // Never fail the lead submission because of email rendering/delivery.
    console.error("[email] lead welcome threw", e);
    return {
      ok: false,
      error: e instanceof Error ? e.message : "email_send_failed",
    };
  }
}

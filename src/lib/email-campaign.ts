import { render } from "@react-email/render";
import { Resend } from "resend";
import { LeadWelcomeEmail } from "@/emails/lead-welcome";
import type { Campaign } from "@/lib/campaigns";
import { listEmailFontsAdmin } from "@/lib/data/email-fonts";
import { DEFAULT_LEAD_WELCOME_BLOCKS } from "@/lib/email-blocks";
import {
  applyTemplateVars,
  type EmailTemplate,
} from "@/lib/email-templates";
import { LEAD_DISCOUNT_CODE } from "@/lib/lead-offer";
import type { Customer } from "@/lib/types";

const BATCH_SIZE = 100;

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

function fromAddress(): string {
  const raw =
    process.env.EMAIL_FROM?.trim() || "Aeris Beauté <onboarding@resend.dev>";
  if (raw.includes("<")) return raw;
  if (raw.includes("@")) return `Aeris Beauté <${raw}>`;
  return raw;
}

function campaignToTemplate(campaign: Campaign): EmailTemplate {
  return {
    id: `campaign-${campaign.id}`,
    name: campaign.name,
    description: null,
    kind: "campaign",
    subject: campaign.emailSubject?.trim() || "Aeris Beauté",
    accentColor: campaign.emailAccentColor?.trim() || "#6f2c3f",
    blocks:
      campaign.emailBlocks && campaign.emailBlocks.length > 0
        ? campaign.emailBlocks
        : DEFAULT_LEAD_WELCOME_BLOCKS,
    updatedAt: campaign.updatedAt,
  };
}

export type BulkEmailResult = {
  ok: boolean;
  sent: number;
  failed: number;
  error?: string;
  mocked?: boolean;
};

/**
 * Send a campaign email to many recipients via Resend batch API (chunks of 100).
 * Each recipient gets a personalized subject/HTML (`{name}` placeholders).
 */
export async function sendCampaignEmailBatch(input: {
  campaign: Campaign;
  recipients: Customer[];
}): Promise<BulkEmailResult> {
  const withEmail = input.recipients.filter(
    (c): c is Customer & { email: string } => Boolean(c.email?.trim()),
  );
  if (withEmail.length === 0) {
    return {
      ok: false,
      sent: 0,
      failed: 0,
      error: "No segment members have an email address.",
    };
  }

  const resend = getResend();
  const template = campaignToTemplate(input.campaign);
  const customFonts = await listEmailFontsAdmin();
  const from = fromAddress();

  if (!resend) {
    console.info(
      "[email:mock] campaign batch",
      { campaignId: input.campaign.id, count: withEmail.length },
    );
    return {
      ok: true,
      sent: withEmail.length,
      failed: 0,
      mocked: true,
    };
  }

  let sent = 0;
  let failed = 0;
  let lastError: string | undefined;

  for (let i = 0; i < withEmail.length; i += BATCH_SIZE) {
    const chunk = withEmail.slice(i, i + BATCH_SIZE);
    const payloads = await Promise.all(
      chunk.map(async (customer) => {
        const vars = { name: customer.name };
        const subject = applyTemplateVars(template.subject, vars);
        const html = await render(
          LeadWelcomeEmail({
            name: customer.name,
            discountCode: LEAD_DISCOUNT_CODE,
            template,
            customFonts,
          }),
        );
        return {
          from,
          to: [customer.email],
          subject,
          html,
        };
      }),
    );

    const { data, error } = await resend.batch.send(payloads, {
      idempotencyKey: `campaign-${input.campaign.id}/chunk-${i / BATCH_SIZE}`,
    });

    if (error) {
      console.error("[email] campaign batch chunk failed", error);
      failed += chunk.length;
      lastError = error.message;
      continue;
    }

    const created = Array.isArray(data?.data) ? data.data.length : chunk.length;
    sent += created;
    if (created < chunk.length) failed += chunk.length - created;
  }

  return {
    ok: sent > 0,
    sent,
    failed,
    error: sent === 0 ? (lastError ?? "All batch chunks failed.") : lastError,
  };
}

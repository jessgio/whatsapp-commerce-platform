import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/guard";
import { can } from "@/lib/rbac";
import { getCampaign } from "@/lib/data/campaigns";
import { listEmailFonts } from "@/lib/data/email-fonts";
import { listEmailTemplates } from "@/lib/data/email-templates";
import { listCustomers } from "@/lib/data/repo";
import { listSegmentDefinitions } from "@/lib/data/segments";
import {
  listWaInteractiveDesigns,
  listWaTemplateDesigns,
} from "@/lib/data/whatsapp-designs";
import { countCustomersByRules } from "@/lib/segments";
import { PageHeader } from "@/components/ui";
import { CampaignForm } from "@/components/marketing/campaign-form";

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePermission("marketing.view");
  const { id } = await params;

  const [campaign, segments, customers, templates, interactive, emails, fonts] =
    await Promise.all([
      getCampaign(id),
      listSegmentDefinitions(),
      listCustomers(),
      listWaTemplateDesigns(),
      listWaInteractiveDesigns(),
      listEmailTemplates(),
      listEmailFonts(),
    ]);
  if (!campaign) notFound();

  // A campaign can only reach opted-in customers, so narrow once rather than
  // re-filtering the whole list for every segment in the dropdown.
  const reachable = customers.filter((c) => c.consentStatus === "opted_in");
  const now = new Date();

  const segmentOptions = segments.map((s) => ({
    id: s.id,
    name: s.name,
    memberCount: countCustomersByRules(reachable, s.rules, now),
  }));

  const selected = campaign.segmentId
    ? segments.find((s) => s.id === campaign.segmentId)
    : null;
  const audienceCount = selected
    ? countCustomersByRules(reachable, selected.rules, now)
    : 0;

  return (
    <div className="space-y-4">
      <div>
        <Link
          href="/marketing/campaigns"
          className="text-sm text-muted hover:text-foreground"
        >
          ← Back to campaigns
        </Link>
        <PageHeader
          title={campaign.name}
          subtitle="Audience, schedule, and message design"
        />
      </div>
      <CampaignForm
        initial={campaign}
        segments={segmentOptions}
        templateDesigns={templates.map((t) => ({ id: t.id, name: t.name }))}
        interactiveDesigns={interactive.map((t) => ({
          id: t.id,
          name: t.name,
        }))}
        emailLibrary={emails}
        customFonts={fonts}
        canSend={can(user.role, "marketing.send")}
        audienceCount={audienceCount}
      />
    </div>
  );
}

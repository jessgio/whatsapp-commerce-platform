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
import { filterCustomersByRules } from "@/lib/segments";
import { PageHeader } from "@/components/ui";
import { CampaignForm } from "@/components/marketing/campaign-form";

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePermission("marketing.view");
  const { id } = await params;
  const campaign = await getCampaign(id);
  if (!campaign) notFound();

  const [segments, customers, templates, interactive, emails, fonts] =
    await Promise.all([
      listSegmentDefinitions(),
      listCustomers(),
      listWaTemplateDesigns(),
      listWaInteractiveDesigns(),
      listEmailTemplates(),
      listEmailFonts(),
    ]);

  const segmentOptions = segments.map((s) => ({
    id: s.id,
    name: s.name,
    memberCount: filterCustomersByRules(customers, s.rules).filter(
      (c) => c.consentStatus === "opted_in",
    ).length,
  }));

  const selected = campaign.segmentId
    ? segments.find((s) => s.id === campaign.segmentId)
    : null;
  const audienceCount = selected
    ? filterCustomersByRules(customers, selected.rules).filter(
        (c) => c.consentStatus === "opted_in",
      ).length
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

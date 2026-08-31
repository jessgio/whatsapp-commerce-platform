import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/guard";
import { can } from "@/lib/rbac";
import { getCampaign } from "@/lib/data/campaigns";
import { listEmailFonts } from "@/lib/data/email-fonts";
import { listEmailTemplates } from "@/lib/data/email-templates";
import { countSegmentMembers } from "@/lib/data/segment-members";
import { listSegmentDefinitions } from "@/lib/data/segments";
import {
  listWaInteractiveDesigns,
  listWaTemplateDesigns,
} from "@/lib/data/whatsapp-designs";
import { ArrowLeft } from "lucide-react";
import { Button, PageHeader } from "@/components/ui";
import { CampaignForm } from "@/components/marketing/campaign-form";
import { DeleteCampaignButton } from "@/components/marketing/campaign-row-actions";

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePermission("marketing.view");
  const { id } = await params;

  const [campaign, segments, templates, interactive, emails, fonts] =
    await Promise.all([
      getCampaign(id),
      listSegmentDefinitions(),
      listWaTemplateDesigns(),
      listWaInteractiveDesigns(),
      listEmailTemplates(),
      listEmailFonts(),
    ]);
  if (!campaign) notFound();

  // Counted in Postgres. A campaign can only reach opted-in customers, so the
  // dropdown shows the number that would actually be messaged.
  const memberCounts = await Promise.all(
    segments.map((s) => countSegmentMembers(s.rules, { consentStatus: "opted_in" })),
  );
  const segmentOptions = segments.map((s, i) => ({
    id: s.id,
    name: s.name,
    memberCount: memberCounts[i],
  }));

  const selectedIndex = campaign.segmentId
    ? segments.findIndex((s) => s.id === campaign.segmentId)
    : -1;
  const audienceCount = selectedIndex >= 0 ? memberCounts[selectedIndex] : 0;

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <Link href="/marketing/campaigns" className="inline-flex">
          <Button variant="secondary" className="h-8 px-2.5 text-xs">
            <ArrowLeft size={14} /> Back to campaigns
          </Button>
        </Link>
        <PageHeader
          title={campaign.name}
          subtitle="Audience, schedule, and message design"
          actions={
            can(user.role, "marketing.edit") ? (
              <DeleteCampaignButton
                id={campaign.id}
                name={campaign.name}
                status={campaign.status}
                afterDelete="list"
              />
            ) : undefined
          }
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

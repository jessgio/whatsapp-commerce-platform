import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/guard";
import { saveCampaign } from "@/lib/data/campaigns";
import { emptyCampaign } from "@/lib/campaigns";

export default async function NewCampaignPage() {
  await requirePermission("marketing.edit");
  const campaign = emptyCampaign({
    name: "Untitled campaign",
    channel: "whatsapp",
    waMode: "template",
  });
  await saveCampaign(campaign);
  redirect(`/marketing/campaigns/${campaign.id}`);
}

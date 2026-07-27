import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/guard";
import { saveEmailTemplate } from "@/lib/data/email-templates";
import { emptyCampaignEmailTemplate } from "@/lib/email-templates";

export default async function NewEmailTemplatePage() {
  await requirePermission("marketing.edit");
  const template = emptyCampaignEmailTemplate({ name: "Untitled email" });
  await saveEmailTemplate(template);
  redirect(`/marketing/design/email/${template.id}`);
}

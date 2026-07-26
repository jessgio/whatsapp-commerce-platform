import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/guard";
import { saveWaTemplateDesign } from "@/lib/data/whatsapp-designs";
import { defaultWaTemplateDesign } from "@/lib/whatsapp-designs";

export default async function NewWaTemplatePage() {
  await requirePermission("marketing.edit");
  const design = defaultWaTemplateDesign();
  await saveWaTemplateDesign(design);
  redirect(`/marketing/design/whatsapp/templates/${design.id}`);
}

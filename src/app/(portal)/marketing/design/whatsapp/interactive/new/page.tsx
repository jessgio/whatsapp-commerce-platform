import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/guard";
import { saveWaInteractiveDesign } from "@/lib/data/whatsapp-designs";
import { defaultWaInteractiveDesign } from "@/lib/whatsapp-designs";

export default async function NewWaInteractivePage() {
  await requirePermission("marketing.edit");
  const design = defaultWaInteractiveDesign();
  await saveWaInteractiveDesign(design);
  redirect(`/marketing/design/whatsapp/interactive/${design.id}`);
}

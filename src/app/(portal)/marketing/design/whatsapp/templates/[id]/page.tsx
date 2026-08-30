import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/guard";
import { getWaTemplateDesign } from "@/lib/data/whatsapp-designs";
import { EditorPageShell } from "@/components/editor/editor-page-shell";
import { WaTemplateEditor } from "@/components/marketing/wa-template-editor";
import { saveWaTemplateDesignAction } from "@/app/(portal)/marketing/design/actions";

export default async function WaTemplateEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("marketing.view");
  const { id } = await params;
  const design = await getWaTemplateDesign(id);
  if (!design) notFound();

  return (
    <EditorPageShell
      backHref="/marketing/design/whatsapp/templates"
      backLabel="WhatsApp templates"
      title={design.name}
      meta="Meta-compliant template · phone preview updates as you edit"
      bodyClassName="overflow-y-auto"
    >
      <WaTemplateEditor initial={design} onSave={saveWaTemplateDesignAction} />
    </EditorPageShell>
  );
}

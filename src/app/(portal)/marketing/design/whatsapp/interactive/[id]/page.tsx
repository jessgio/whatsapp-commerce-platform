import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/guard";
import { getWaInteractiveDesign } from "@/lib/data/whatsapp-designs";
import { EditorPageShell } from "@/components/editor/editor-page-shell";
import { WaInteractiveEditor } from "@/components/marketing/wa-interactive-editor";
import { saveWaInteractiveDesignAction } from "@/app/(portal)/marketing/design/actions";

export default async function WaInteractiveEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("marketing.view");
  const { id } = await params;
  const design = await getWaInteractiveDesign(id);
  if (!design) notFound();

  return (
    <EditorPageShell
      backHref="/marketing/design/whatsapp/interactive"
      backLabel="Interactive designs"
      title={design.name}
      meta="Session messages · reply buttons and lists · 24h window only"
      bodyClassName="overflow-y-auto"
    >
      <WaInteractiveEditor
        initial={design}
        onSave={saveWaInteractiveDesignAction}
      />
    </EditorPageShell>
  );
}

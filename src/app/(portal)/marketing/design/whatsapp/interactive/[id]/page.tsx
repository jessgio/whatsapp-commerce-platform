import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/guard";
import { getWaInteractiveDesign } from "@/lib/data/whatsapp-designs";
import { PageHeader } from "@/components/ui";
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
    <div className="space-y-4">
      <div>
        <Link
          href="/marketing/design/whatsapp/interactive"
          className="text-sm text-muted hover:text-foreground"
        >
          ← Back to interactive designs
        </Link>
        <PageHeader
          title={design.name}
          subtitle="Interactive session designer · 24h window only"
        />
      </div>
      <WaInteractiveEditor
        initial={design}
        onSave={saveWaInteractiveDesignAction}
      />
    </div>
  );
}

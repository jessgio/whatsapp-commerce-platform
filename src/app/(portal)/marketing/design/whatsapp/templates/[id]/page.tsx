import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/guard";
import { getWaTemplateDesign } from "@/lib/data/whatsapp-designs";
import { PageHeader } from "@/components/ui";
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
    <div className="space-y-4">
      <div>
        <Link
          href="/marketing/design/whatsapp/templates"
          className="text-sm text-muted hover:text-foreground"
        >
          ← Back to templates
        </Link>
        <PageHeader
          title={design.name}
          subtitle="WhatsApp template designer · phone preview updates as you edit"
        />
      </div>
      <WaTemplateEditor initial={design} onSave={saveWaTemplateDesignAction} />
    </div>
  );
}

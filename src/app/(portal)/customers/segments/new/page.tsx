import Link from "next/link";
import { requirePermission } from "@/lib/guard";
import { PageHeader } from "@/components/ui";
import { SegmentBuilder } from "@/components/customers/segment-builder";

export default async function NewCustomerSegmentPage() {
  await requirePermission("customers.edit");

  return (
    <div>
      <PageHeader
        title="New segment"
        subtitle="Define rules — membership updates automatically as customers change"
      />
      <div className="mb-4 text-sm">
        <Link href="/customers/segments" className="text-merlot hover:underline">
          ← All segments
        </Link>
      </div>
      <SegmentBuilder canEdit />
    </div>
  );
}

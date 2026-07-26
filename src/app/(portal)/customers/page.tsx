import Link from "next/link";
import { Layers, UploadCloud } from "lucide-react";
import { requirePermission } from "@/lib/guard";
import { can } from "@/lib/rbac";
import { listCustomers } from "@/lib/data/repo";
import { listSegmentDefinitions } from "@/lib/data/segments";
import { Button, PageHeader } from "@/components/ui";
import { CustomerTable } from "@/components/customers/customer-table";

export default async function CustomersPage() {
  const user = await requirePermission("customers.view");
  const [customers, segments] = await Promise.all([
    listCustomers(),
    listSegmentDefinitions(),
  ]);
  const canSeePii = can(user.role, "customers.pii");
  const canEdit = can(user.role, "customers.edit");

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle="Unified profiles keyed off each WhatsApp identity (wa_id)"
        actions={
          <>
            <Link href="/customers/segments">
              <Button variant="secondary">
                <Layers size={15} /> Segments
              </Button>
            </Link>
            {canEdit ? (
              <Button variant="secondary">
                <UploadCloud size={15} /> Import contacts
              </Button>
            ) : null}
          </>
        }
      />
      <CustomerTable
        customers={customers}
        canSeePii={canSeePii}
        segments={segments}
      />
    </div>
  );
}

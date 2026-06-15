import { UploadCloud } from "lucide-react";
import { requirePermission } from "@/lib/guard";
import { can } from "@/lib/rbac";
import { listCustomers } from "@/lib/data/repo";
import { Button, PageHeader } from "@/components/ui";
import { CustomerTable } from "@/components/customers/customer-table";

export default async function CustomersPage() {
  const user = await requirePermission("customers.view");
  const customers = await listCustomers();
  const canSeePii = can(user.role, "customers.pii");

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle="Unified profiles keyed off each WhatsApp identity (wa_id)"
        actions={
          can(user.role, "customers.edit") ? (
            <Button variant="secondary">
              <UploadCloud size={15} /> Import contacts
            </Button>
          ) : undefined
        }
      />
      <CustomerTable customers={customers} canSeePii={canSeePii} />
    </div>
  );
}

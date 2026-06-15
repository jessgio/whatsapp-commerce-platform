import { requirePermission } from "@/lib/guard";
import { can } from "@/lib/rbac";
import { listProducts } from "@/lib/data/repo";
import { PageHeader, StatCard } from "@/components/ui";
import { CatalogTable } from "@/components/catalog/catalog-table";
import { PushCatalogButton } from "@/components/catalog/push-button";
import { formatNumber } from "@/lib/format";

export default async function CatalogPage() {
  const user = await requirePermission("catalog.view");
  const products = await listProducts();
  const canEdit = can(user.role, "catalog.edit");

  const inStock = products.filter((p) => p.stock > 0).length;
  const lowStock = products.filter((p) => p.stock <= p.reorderPoint).length;
  const pendingSync = products.filter((p) => p.catalogSync !== "synced").length;

  return (
    <div>
      <PageHeader
        title="Catalog & Pricing"
        subtitle="Manage SKUs, retail prices and discounts — push live to your WhatsApp catalog"
        actions={canEdit ? <PushCatalogButton /> : undefined}
      />

      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Active SKUs" value={formatNumber(products.length)} />
        <StatCard label="In stock" value={formatNumber(inStock)} />
        <StatCard label="Low / out of stock" value={formatNumber(lowStock)} />
        <StatCard label="Pending catalog sync" value={formatNumber(pendingSync)} />
      </div>

      <CatalogTable products={products} canEdit={canEdit} />
    </div>
  );
}

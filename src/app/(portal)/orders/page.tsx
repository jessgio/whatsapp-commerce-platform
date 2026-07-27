import { requirePermission } from "@/lib/guard";
import { countOrders, listOrders } from "@/lib/data/repo";
import { PageHeader } from "@/components/ui";
import { OrdersTable } from "@/components/orders/orders-table";

export default async function OrdersPage() {
  await requirePermission("orders.view");
  const [orders, total] = await Promise.all([listOrders(), countOrders()]);

  return (
    <div>
      <PageHeader
        title="Orders"
        subtitle="Orders from WhatsApp carts and agent-created sales"
      />
      <OrdersTable orders={orders} total={total} />
    </div>
  );
}

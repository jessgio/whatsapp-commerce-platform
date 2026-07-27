import { getOrder } from "@/lib/data/repo";
import { requireStaffApiUser, withStaffDataContext } from "@/lib/staff/auth";
import { handleStaffError, jsonError, jsonOk } from "@/lib/staff/http";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const ctx = await requireStaffApiUser(request, "orders.view");
    const order = await withStaffDataContext(ctx, () => getOrder(id));
    if (!order) return jsonError(404, "Order not found.");
    return jsonOk({ order });
  } catch (err) {
    return handleStaffError(err);
  }
}

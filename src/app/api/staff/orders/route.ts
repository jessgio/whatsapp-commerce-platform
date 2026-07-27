import { listOrders } from "@/lib/data/repo";
import { requireStaffApiUser, withStaffDataContext } from "@/lib/staff/auth";
import { handleStaffError, jsonOk } from "@/lib/staff/http";

export async function GET(request: Request) {
  try {
    const ctx = await requireStaffApiUser(request, "orders.view");
    const orders = await withStaffDataContext(ctx, () => listOrders());
    return jsonOk({ orders });
  } catch (err) {
    return handleStaffError(err);
  }
}

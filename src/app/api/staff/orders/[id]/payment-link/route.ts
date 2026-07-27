import { requireStaffApiUser, withStaffDataContext } from "@/lib/staff/auth";
import { handleStaffError, jsonError, jsonOk } from "@/lib/staff/http";
import { generateOrderPaymentLink } from "@/lib/services/order-mutations";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const ctx = await requireStaffApiUser(request, "orders.edit");
    const result = await withStaffDataContext(ctx, () => generateOrderPaymentLink(id));
    if (!result.ok) return jsonError(400, result.error ?? "Failed.");
    return jsonOk(result);
  } catch (err) {
    return handleStaffError(err);
  }
}

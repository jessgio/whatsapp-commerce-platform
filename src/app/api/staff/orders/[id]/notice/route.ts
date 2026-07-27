import { requireStaffApiUser, withStaffDataContext } from "@/lib/staff/auth";
import { handleStaffError, jsonError, jsonOk } from "@/lib/staff/http";
import { raiseOrderWarehouseNotice } from "@/lib/services/order-mutations";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const ctx = await requireStaffApiUser(request, "orders.edit");
    const body = (await request.json().catch(() => null)) as { message?: string } | null;
    const message = String(body?.message ?? "");
    const result = await withStaffDataContext(ctx, () =>
      raiseOrderWarehouseNotice(id, message, ctx.user.name),
    );
    if (!result.ok) return jsonError(400, result.error ?? "Failed.");
    return jsonOk({ ok: true });
  } catch (err) {
    return handleStaffError(err);
  }
}

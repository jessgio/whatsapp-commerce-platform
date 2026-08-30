import { assignConversationTo, claimConversation } from "@/lib/services/cs-routing";
import { requireStaffApiUser, withStaffDataContext } from "@/lib/staff/auth";
import { handleStaffError, jsonError, jsonOk } from "@/lib/staff/http";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const ctx = await requireStaffApiUser(request, "inbox.reply");
    const body = (await request.json().catch(() => null)) as {
      assigneeId?: string | null;
      claim?: boolean;
    } | null;

    if (!body) {
      return jsonError(400, "Provide assigneeId or claim: true.");
    }
    if (!body.claim && body.assigneeId === undefined) {
      return jsonError(400, "Provide assigneeId or claim: true.");
    }

    const result = await withStaffDataContext(ctx, () => {
      if (body.claim) return claimConversation(id, ctx.user.id);
      return assignConversationTo(id, body.assigneeId || null);
    });
    if (!result.ok) return jsonError(400, result.error ?? "Assign failed.");
    return jsonOk({ ok: true });
  } catch (err) {
    return handleStaffError(err);
  }
}

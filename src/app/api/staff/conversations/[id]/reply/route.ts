import { requireStaffApiUser, withStaffDataContext } from "@/lib/staff/auth";
import { handleStaffError, jsonError, jsonOk } from "@/lib/staff/http";
import { sendConversationReply } from "@/lib/services/inbox-reply";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const ctx = await requireStaffApiUser(request, "inbox.reply");
    const body = (await request.json().catch(() => null)) as { body?: string } | null;
    const text = String(body?.body ?? "");
    const result = await withStaffDataContext(ctx, () => sendConversationReply(id, text));
    if (!result.ok) return jsonError(400, result.error ?? "Send failed.");
    return jsonOk({ ok: true });
  } catch (err) {
    return handleStaffError(err);
  }
}

import { getConversation, listMessages } from "@/lib/data/repo";
import { requireStaffApiUser, withStaffDataContext } from "@/lib/staff/auth";
import { handleStaffError, jsonError, jsonOk } from "@/lib/staff/http";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const ctx = await requireStaffApiUser(request, "inbox.view");
    const payload = await withStaffDataContext(ctx, async () => {
      const [conversation, messages] = await Promise.all([
        getConversation(id),
        listMessages(id),
      ]);
      return { conversation, messages };
    });
    if (!payload.conversation) return jsonError(404, "Conversation not found.");
    return jsonOk(payload);
  } catch (err) {
    return handleStaffError(err);
  }
}

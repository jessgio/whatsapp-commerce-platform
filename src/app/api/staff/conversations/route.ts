import { listConversations } from "@/lib/data/repo";
import { requireStaffApiUser, withStaffDataContext } from "@/lib/staff/auth";
import { handleStaffError, jsonOk } from "@/lib/staff/http";

export async function GET(request: Request) {
  try {
    const ctx = await requireStaffApiUser(request, "inbox.view");
    const conversations = await withStaffDataContext(ctx, () => listConversations());
    return jsonOk({ conversations });
  } catch (err) {
    return handleStaffError(err);
  }
}

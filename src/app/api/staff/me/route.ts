import { requireStaffApiUser, staffMePayload } from "@/lib/staff/auth";
import { handleStaffError, jsonOk } from "@/lib/staff/http";

export async function GET(request: Request) {
  try {
    const { user } = await requireStaffApiUser(request);
    return jsonOk(staffMePayload(user));
  } catch (err) {
    return handleStaffError(err);
  }
}

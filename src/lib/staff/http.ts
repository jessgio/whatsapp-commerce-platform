import { NextResponse } from "next/server";
import { StaffAuthError } from "@/lib/staff/auth";

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function jsonError(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

export function handleStaffError(err: unknown) {
  if (err instanceof StaffAuthError) {
    return jsonError(err.status, err.message);
  }
  console.error("[api/staff]", err);
  return jsonError(500, "Internal server error.");
}

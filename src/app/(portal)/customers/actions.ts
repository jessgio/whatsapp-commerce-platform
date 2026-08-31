"use server";

import { revalidatePath } from "next/cache";
import { importCustomers } from "@/lib/data/repo";
import {
  IMPORT_MAX_BYTES,
  parseContactsXlsx,
} from "@/lib/customers/import-xlsx";
import { requirePermission } from "@/lib/guard";

export type ImportContactsResult = {
  ok: boolean;
  error?: string;
  created?: number;
  updated?: number;
  skipped?: { row: number; reason: string }[];
};

export async function importContactsAction(
  formData: FormData,
): Promise<ImportContactsResult> {
  await requirePermission("customers.edit");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Choose an Excel (.xlsx) file to import." };
  }
  if (file.size > IMPORT_MAX_BYTES) {
    return { ok: false, error: "File is too large. Maximum size is 2 MB." };
  }
  const name = file.name.toLowerCase();
  if (!name.endsWith(".xlsx")) {
    return { ok: false, error: "Use the Excel template (.xlsx)." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let parsed;
  try {
    parsed = await parseContactsXlsx(buffer);
  } catch (e) {
    console.error("[customers:import] parse failed", e);
    return { ok: false, error: "Could not read that spreadsheet. Download the template and try again." };
  }

  if (parsed.rows.length === 0 && parsed.skipped.length === 0) {
    return { ok: false, error: "No contact rows found. Keep the header row and add at least one contact." };
  }
  if (parsed.rows.length === 0) {
    return { ok: false, error: parsed.skipped[0]?.reason ?? "No valid contacts in the file.", skipped: parsed.skipped };
  }

  const result = await importCustomers(parsed.rows);
  revalidatePath("/customers");

  return {
    ok: true,
    created: result.created,
    updated: result.updated,
    skipped: [...parsed.skipped, ...result.failed],
  };
}

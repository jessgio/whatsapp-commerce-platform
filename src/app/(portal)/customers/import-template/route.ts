import { NextResponse } from "next/server";
import { buildContactsTemplateXlsx } from "@/lib/customers/import-xlsx";
import { requirePermission } from "@/lib/guard";

export async function GET() {
  await requirePermission("customers.edit");
  const buffer = await buildContactsTemplateXlsx();
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="aeris-contacts-template.xlsx"',
      "Cache-Control": "private, no-store",
    },
  });
}

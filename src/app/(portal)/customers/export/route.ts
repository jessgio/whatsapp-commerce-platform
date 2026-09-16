import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/guard";
import { listCustomers } from "@/lib/data/repo";
import {
  buildCustomersExportXlsx,
  customerExportFilename,
  type CustomerExportSource,
} from "@/lib/customers/export-xlsx";

function parseSource(raw: string | null): CustomerExportSource {
  if (raw === "internal" || raw === "voucher" || raw === "form_digital") {
    return raw;
  }
  return "all";
}

export async function GET(req: NextRequest) {
  await requirePermission("customers.pii");
  const source = parseSource(req.nextUrl.searchParams.get("source"));
  const customers = await listCustomers();
  const buffer = await buildCustomersExportXlsx(customers, source);
  const filename = customerExportFilename(source);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

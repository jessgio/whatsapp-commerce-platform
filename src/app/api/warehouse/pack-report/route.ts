import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { listPackSessions } from "@/lib/data/repo";

function csvCell(v: string | number): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function durationSecs(start: string, end: string | null): number {
  if (!end) return 0;
  return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 1000);
}

/**
 * Downloadable pack throughput report.
 *   /api/warehouse/pack-report           -> one row per pack session (summary)
 *   /api/warehouse/pack-report?detail=1  -> one row per individual scan (audit)
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "warehouse.view")) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const detail = req.nextUrl.searchParams.get("detail") === "1";
  const sessions = await listPackSessions();
  const rows: (string | number)[][] = [];

  if (detail) {
    rows.push(["Order", "Label/AWB", "Packer", "SKU", "Product", "Scanned At"]);
    for (const s of sessions) {
      for (const scan of s.scans) {
        const prod = s.items.find((i) => i.name === scan.name);
        rows.push([s.orderCode, s.labelNumber, s.packerName, prod?.sku ?? scan.sku, scan.name, scan.at]);
      }
    }
  } else {
    rows.push([
      "Session",
      "Order",
      "Label/AWB",
      "Packer",
      "Status",
      "Started At",
      "Completed At",
      "Duration (s)",
      "Lines",
      "Units Scanned",
    ]);
    for (const s of sessions) {
      const units = s.scans.length;
      rows.push([
        s.id,
        s.orderCode,
        s.labelNumber,
        s.packerName,
        s.status,
        s.startedAt,
        s.completedAt ?? "",
        durationSecs(s.startedAt, s.completedAt),
        s.items.length,
        units,
      ]);
    }
  }

  const csv = rows.map((r) => r.map(csvCell).join(",")).join("\n");
  const filename = detail ? "pack-scans-detail.csv" : "pack-report.csv";

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

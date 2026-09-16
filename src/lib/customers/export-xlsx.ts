import "server-only";
import ExcelJS from "exceljs";
import {
  extraCustomerTags,
  matchesCustomerSource,
  SOURCE_LABEL,
  customerSources,
  type CustomerSource,
} from "@/lib/customers/source";
import type { Customer } from "@/lib/types";

export type CustomerExportSource = "all" | CustomerSource;

function jakartaStamp(d = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function customerExportFilename(source: CustomerExportSource = "all"): string {
  const day = jakartaStamp();
  const suffix = source === "all" ? "all" : source.replace("_", "-");
  return `aeris-customers-${suffix}-${day}.xlsx`;
}

export async function buildCustomersExportXlsx(
  customers: Customer[],
  source: CustomerExportSource = "all",
): Promise<Buffer> {
  const rows = customers.filter((c) => matchesCustomerSource(c, source));

  const wb = new ExcelJS.Workbook();
  wb.creator = "Aeris WhatsApp Commerce";
  wb.created = new Date();

  const sheet = wb.addWorksheet("Customers", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  sheet.columns = [
    { header: "name", key: "name", width: 28 },
    { header: "phone", key: "phone", width: 20 },
    { header: "email", key: "email", width: 32 },
    { header: "city", key: "city", width: 22 },
    { header: "birth_date", key: "birth_date", width: 14 },
    { header: "tags", key: "tags", width: 22 },
    { header: "source", key: "source", width: 22 },
    { header: "consent", key: "consent", width: 12 },
    { header: "discount_fisik", key: "discount_fisik", width: 16 },
    { header: "discount_digital", key: "discount_digital", width: 18 },
    { header: "signed_up", key: "signed_up", width: 22 },
  ];
  sheet.getRow(1).font = { bold: true };
  sheet.getColumn("phone").numFmt = "@";
  sheet.getColumn("birth_date").numFmt = "@";

  for (const c of rows) {
    const sources = customerSources(c)
      .map((s) => SOURCE_LABEL[s])
      .join(", ");
    sheet.addRow({
      name: c.name,
      phone: c.phone,
      email: c.email ?? "",
      city: c.city ?? "",
      birth_date: c.birthDate ?? "",
      tags: extraCustomerTags(c.tags).join(", "),
      source: sources || "",
      consent: c.consentStatus,
      discount_fisik: c.leadDiscountCode ?? "",
      discount_digital: c.digitalDiscountCode ?? "",
      signed_up: c.termsAcceptedAt || c.createdAt || "",
    });
  }

  const help = wb.addWorksheet("Instructions");
  help.columns = [{ width: 92 }];
  help.addRows([
    ["Aeris · customer export"],
    [""],
    ["This is a snapshot of contacts already in CRM (imports, fisik /daftar, and Form Digital)."],
    ["The name/phone/email/city/birth_date/tags columns match the import template."],
    ["source, consent, and discount columns are extra — leave them off if you re-import."],
    [""],
    ["source Internal = Excel import. Voucher = fisik card /daftar. Form Digital = /f/ share link."],
    [`Exported ${rows.length} row${rows.length === 1 ? "" : "s"} (${source === "all" ? "all sources" : SOURCE_LABEL[source]}).`],
  ]);

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

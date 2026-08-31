import "server-only";
import ExcelJS from "exceljs";
import { normalizePhone } from "@/lib/phone";

export const IMPORT_MAX_ROWS = 1000;
export const IMPORT_MAX_BYTES = 2 * 1024 * 1024;

export type ParsedImportRow = {
  row: number;
  name: string;
  waId: string;
  phone: string;
  email: string | null;
  city: string | null;
  birthDate: string | null;
  tags: string[];
};

export type ParsedImport = {
  rows: ParsedImportRow[];
  skipped: { row: number; reason: string }[];
};

const HEADER_ALIASES: Record<string, string> = {
  name: "name",
  nama: "name",
  full_name: "name",
  fullname: "name",
  phone: "phone",
  nomor: "phone",
  no_hp: "phone",
  nohp: "phone",
  handphone: "phone",
  whatsapp: "phone",
  wa: "phone",
  wa_id: "phone",
  email: "email",
  city: "city",
  kota: "city",
  birth_date: "birth_date",
  birthdate: "birth_date",
  tanggal_lahir: "birth_date",
  dob: "birth_date",
  tags: "tags",
  tag: "tags",
  label: "tags",
};

function normHeader(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function cellText(value: unknown): string {
  if (value == null || value === "") return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "object" && value && "text" in value) {
    return String((value as { text: unknown }).text ?? "").trim();
  }
  if (typeof value === "object" && value && "richText" in value) {
    const parts = (value as { richText?: { text?: string }[] }).richText ?? [];
    return parts.map((p) => p.text ?? "").join("").trim();
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    if (value > 20000 && value < 80000 && Number.isInteger(value)) {
      const utc = Date.UTC(1899, 11, 30) + value * 86400000;
      return new Date(utc).toISOString().slice(0, 10);
    }
    return String(value);
  }
  return String(value).trim();
}

function parseBirthDate(raw: string): string | null {
  if (!raw) return null;
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = raw.match(/^(\d{1,2})[\/.](\d{1,2})[\/.](\d{4})$/);
  if (dmy) {
    const dd = dmy[1].padStart(2, "0");
    const mm = dmy[2].padStart(2, "0");
    return `${dmy[3]}-${mm}-${dd}`;
  }
  return null;
}

function parseTags(raw: string): string[] {
  if (!raw) return [];
  return raw
    .split(/[,;|]/)
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function parseEmail(raw: string): string | null {
  const email = raw.trim().toLowerCase();
  if (!email) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

export async function buildContactsTemplateXlsx(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Aeris WhatsApp Commerce";

  const sheet = wb.addWorksheet("Contacts", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  sheet.columns = [
    { header: "name", key: "name", width: 28 },
    { header: "phone", key: "phone", width: 20 },
    { header: "email", key: "email", width: 32 },
    { header: "city", key: "city", width: 18 },
    { header: "birth_date", key: "birth_date", width: 14 },
    { header: "tags", key: "tags", width: 22 },
  ];
  sheet.getRow(1).font = { bold: true };
  sheet.getColumn("phone").numFmt = "@";
  sheet.getColumn("birth_date").numFmt = "@";

  sheet.addRows([
    {
      name: "Dewi Lestari",
      phone: "+6281234567890",
      email: "dewi@example.com",
      city: "Jakarta",
      birth_date: "1995-03-12",
      tags: "vip, repeat",
    },
    {
      name: "Bagus Pratama",
      phone: "081298765432",
      email: "bagus@example.com",
      city: "Bandung",
      birth_date: "",
      tags: "",
    },
  ]);

  const help = wb.addWorksheet("Instructions");
  help.columns = [{ width: 92 }];
  help.addRows([
    ["Aeris · contact import template"],
    [""],
    ["Use the Contacts sheet. Keep the header row. Delete the sample rows before importing real data."],
    [""],
    ["name (required) - customer display name"],
    ["phone (required) - WhatsApp number. Local 08… or +62… is fine. This becomes the wa_id."],
    ["email (optional)"],
    ["city (optional)"],
    ["birth_date (optional) - YYYY-MM-DD"],
    ["tags (optional) - comma-separated, e.g. vip, wholesale"],
    [""],
    ["Existing contacts are matched by phone (wa_id). Matching rows are updated; new numbers are created."],
    ["Consent stays pending - import does not opt anyone in to WhatsApp campaigns."],
    [`Maximum ${IMPORT_MAX_ROWS} rows per file.`],
  ]);

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

export async function parseContactsXlsx(buffer: Buffer): Promise<ParsedImport> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  const sheet =
    wb.getWorksheet("Contacts") ??
    wb.worksheets.find((s) => s.name.toLowerCase() !== "instructions") ??
    wb.worksheets[0];
  if (!sheet) {
    return { rows: [], skipped: [{ row: 0, reason: "The spreadsheet has no sheets." }] };
  }

  const headerRow = sheet.getRow(1);
  const colMap = new Map<number, string>();
  headerRow.eachCell({ includeEmpty: false }, (cell, col) => {
    const key = HEADER_ALIASES[normHeader(cell.value)];
    if (key) colMap.set(col, key);
  });

  if (![...colMap.values()].includes("name") || ![...colMap.values()].includes("phone")) {
    return {
      rows: [],
      skipped: [
        {
          row: 1,
          reason: "Missing required columns. Need at least name and phone (see the template).",
        },
      ],
    };
  }

  const rows: ParsedImportRow[] = [];
  const skipped: { row: number; reason: string }[] = [];
  const seen = new Set<string>();

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const raw: Record<string, string> = {};
    colMap.forEach((key, col) => {
      raw[key] = cellText(row.getCell(col).value);
    });

    const name = raw.name?.trim() ?? "";
    const phoneRaw = raw.phone?.trim() ?? "";
    if (!name && !phoneRaw && !raw.email && !raw.city) return;

    if (!name) {
      skipped.push({ row: rowNumber, reason: "Name is required." });
      return;
    }
    const normalized = normalizePhone(phoneRaw);
    if (!normalized) {
      skipped.push({ row: rowNumber, reason: "Phone number is missing or invalid." });
      return;
    }
    if (seen.has(normalized.waId)) {
      skipped.push({ row: rowNumber, reason: "Duplicate phone in this file." });
      return;
    }
    seen.add(normalized.waId);

    if (rows.length >= IMPORT_MAX_ROWS) {
      skipped.push({ row: rowNumber, reason: `Over the ${IMPORT_MAX_ROWS}-row limit.` });
      return;
    }

    const emailRaw = raw.email?.trim() ?? "";
    const email = emailRaw ? parseEmail(emailRaw) : null;
    if (emailRaw && !email) {
      skipped.push({ row: rowNumber, reason: "Email looks invalid." });
      return;
    }

    const birthRaw = raw.birth_date?.trim() ?? "";
    const birthDate = birthRaw ? parseBirthDate(birthRaw) : null;
    if (birthRaw && !birthDate) {
      skipped.push({ row: rowNumber, reason: "birth_date must be YYYY-MM-DD." });
      return;
    }

    rows.push({
      row: rowNumber,
      name,
      waId: normalized.waId,
      phone: normalized.phone,
      email,
      city: raw.city?.trim() || null,
      birthDate,
      tags: parseTags(raw.tags ?? ""),
    });
  });

  return { rows, skipped };
}

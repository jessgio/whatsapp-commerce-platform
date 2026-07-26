import { normalizePhone, normalizePhoneParts } from "@/lib/phone";

export type LeadFields = {
  name: string;
  birthDate: string;
  email: string;
  city: string | null;
  waId: string;
  phone: string;
};

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidBirthDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return false;
  const iso = d.toISOString().slice(0, 10);
  if (iso !== value) return false;
  const now = new Date();
  if (d > now) return false;
  const year = d.getUTCFullYear();
  const thisYear = now.getUTCFullYear();
  if (thisYear - year > 120) return false;
  return true;
}

export function parseLeadFields(input: {
  name?: string;
  birthDate?: string;
  phone?: string;
  countryCode?: string;
  email?: string;
  city?: string;
}): { data: LeadFields } | { error: string } {
  const name = input.name?.trim() ?? "";
  const birthDate = input.birthDate?.trim() ?? "";
  const email = input.email?.trim().toLowerCase() ?? "";
  const city = input.city?.trim() || null;
  const phoneRaw = input.phone?.trim() ?? "";
  const countryCode = input.countryCode?.trim() ?? "";

  if (!name || name.length < 2) {
    return { error: "Nama lengkap wajib diisi." };
  }
  if (!isValidBirthDate(birthDate)) {
    return { error: "Tanggal lahir tidak valid." };
  }
  const normalized = countryCode
    ? normalizePhoneParts(countryCode, phoneRaw)
    : normalizePhone(phoneRaw);
  if (!normalized) {
    return { error: "Nomor telepon tidak valid." };
  }
  if (!email || !isValidEmail(email)) {
    return { error: "Alamat email tidak valid." };
  }

  return {
    data: {
      name,
      birthDate,
      email,
      city,
      waId: normalized.waId,
      phone: normalized.phone,
    },
  };
}

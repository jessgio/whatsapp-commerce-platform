"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, Select } from "@/components/ui";
import { DatePicker } from "@/components/date-picker";
import { CityCombobox } from "@/components/leads/city-combobox";
import {
  COUNTRY_DIAL_CODES,
  DEFAULT_COUNTRY_DIAL,
} from "@/lib/country-codes";

const fieldClass =
  "mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-merlot focus:ring-2 focus:ring-merlot/20";

export type LeadEditProfile = {
  name: string;
  birthDate: string;
  email: string;
  city: string;
  countryCode: string;
  phone: string;
};

export function LeadEditForm({
  token,
  initial,
}: {
  token: string;
  initial: LeadEditProfile;
}) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [birthDate, setBirthDate] = useState(initial.birthDate);
  const [countryCode, setCountryCode] = useState(
    initial.countryCode || DEFAULT_COUNTRY_DIAL,
  );
  const [phone, setPhone] = useState(initial.phone);
  const [email, setEmail] = useState(initial.email);
  const [city, setCity] = useState(initial.city);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/public/leads/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          name,
          birthDate,
          countryCode,
          phone,
          email,
          city: city || undefined,
        }),
      });
      const json = (await res.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;

      if (!res.ok || !json?.ok) {
        setError(json?.error ?? "Gagal menyimpan perubahan. Coba lagi.");
        return;
      }

      router.push("/daftar/edit/selesai");
    } catch {
      setError("Gagal menyimpan perubahan. Periksa koneksi Anda.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <p className="rounded-lg bg-surface-muted px-3 py-2 text-xs text-muted">
        Perbarui data Anda di bawah ini. Kode diskon tidak akan dikirim ulang.
      </p>

      <div>
        <label htmlFor="name" className="text-sm font-medium text-foreground">
          Nama Lengkap
        </label>
        <input
          id="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={fieldClass}
        />
      </div>

      <div>
        <span className="text-sm font-medium text-foreground">Tanggal Lahir</span>
        <DatePicker
          value={birthDate}
          onChange={setBirthDate}
          max={new Date().toISOString().slice(0, 10)}
          className="mt-1.5"
          placeholder="dd/mm/yyyy"
        />
      </div>

      <div>
        <label htmlFor="phone" className="text-sm font-medium text-foreground">
          Nomor Telepon
        </label>
        <div className="mt-1.5 flex gap-2">
          <Select
            id="countryCode"
            value={countryCode}
            onChange={setCountryCode}
            className="w-[9.5rem] shrink-0 sm:w-44"
            options={COUNTRY_DIAL_CODES.map((c) => ({
              value: c.dial,
              label: `${c.iso} +${c.dial}`,
            }))}
          />
          <input
            id="phone"
            type="tel"
            required
            inputMode="numeric"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-merlot focus:ring-2 focus:ring-merlot/20"
          />
        </div>
      </div>

      <div>
        <label htmlFor="email" className="text-sm font-medium text-foreground">
          Alamat Email
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={fieldClass}
        />
      </div>

      <div>
        <label htmlFor="city" className="text-sm font-medium text-foreground">
          Kota Domisili{" "}
          <span className="font-normal text-muted">(Opsional)</span>
        </label>
        <CityCombobox id="city" value={city} onChange={setCity} />
      </div>

      {error && (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      <Button type="submit" disabled={submitting} className="w-full py-2.5">
        {submitting ? "Menyimpan…" : "Simpan perubahan"}
      </Button>
    </form>
  );
}

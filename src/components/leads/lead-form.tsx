"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { CityCombobox } from "@/components/leads/city-combobox";
import {
  COUNTRY_DIAL_CODES,
  DEFAULT_COUNTRY_DIAL,
} from "@/lib/country-codes";

const TNC =
  "Dengan mengisi data ini, Anda menyetujui penggunaan data pribadi untuk keperluan CRM dan komunikasi dari Aeris Beauté. Kami berkomitmen menjaga kerahasiaan data Anda dan tidak akan menyalahgunakan informasi yang Anda berikan.";

const fieldClass =
  "mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-merlot focus:ring-2 focus:ring-merlot/20";

export function LeadForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [countryCode, setCountryCode] = useState(DEFAULT_COUNTRY_DIAL);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!acceptTerms) {
      setError("Anda harus menyetujui pernyataan Privasi Data.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/public/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          birthDate,
          countryCode,
          phone,
          email,
          city: city || undefined,
          acceptTerms,
        }),
      });
      const json = (await res.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;

      if (!res.ok || !json?.ok) {
        setError(json?.error ?? "Gagal mengirim formulir. Coba lagi.");
        return;
      }

      router.push("/daftar/terima-kasih");
    } catch {
      setError("Gagal mengirim formulir. Periksa koneksi Anda.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="text-sm font-medium text-foreground">
          Nama Lengkap
        </label>
        <input
          id="name"
          name="name"
          required
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={fieldClass}
          placeholder="Sesuai kartu identitas"
        />
      </div>

      <div>
        <label htmlFor="birthDate" className="text-sm font-medium text-foreground">
          Tanggal Lahir
        </label>
        <input
          id="birthDate"
          name="birthDate"
          type="date"
          required
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
          className={fieldClass}
        />
      </div>

      <div>
        <label htmlFor="phone" className="text-sm font-medium text-foreground">
          Nomor Telepon
        </label>
        <div className="mt-1.5 flex gap-2">
          <label htmlFor="countryCode" className="sr-only">
            Kode negara
          </label>
          <select
            id="countryCode"
            name="countryCode"
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value)}
            className="w-[9.5rem] shrink-0 rounded-lg border border-border bg-surface px-2.5 py-2.5 text-sm text-foreground outline-none transition focus:border-merlot focus:ring-2 focus:ring-merlot/20 sm:w-44"
          >
            {COUNTRY_DIAL_CODES.map((c) => (
              <option key={`${c.iso}-${c.dial}`} value={c.dial}>
                {c.iso} +{c.dial}
              </option>
            ))}
          </select>
          <input
            id="phone"
            name="phone"
            type="tel"
            required
            autoComplete="tel-national"
            inputMode="numeric"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-merlot focus:ring-2 focus:ring-merlot/20"
            placeholder={countryCode === "62" ? "812xxxxxxxx" : "Nomor tanpa kode negara"}
          />
        </div>
        <p className="mt-1 text-xs text-muted">
          Pilih kode negara, lalu isi nomor tanpa + atau kode negara.
        </p>
      </div>

      <div>
        <label htmlFor="email" className="text-sm font-medium text-foreground">
          Alamat Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={fieldClass}
          placeholder="nama@email.com"
        />
      </div>

      <div>
        <label htmlFor="city" className="text-sm font-medium text-foreground">
          Kota Domisili{" "}
          <span className="font-normal text-muted">(Opsional)</span>
        </label>
        <CityCombobox id="city" value={city} onChange={setCity} />
      </div>

      <fieldset className="rounded-lg border border-border bg-surface-muted/60 p-4">
        <legend className="px-1 text-sm font-semibold text-foreground">
          Privasi Data
        </legend>

        <label className="flex cursor-pointer gap-3 text-sm leading-relaxed text-foreground">
          <input
            type="checkbox"
            checked={acceptTerms}
            onChange={(e) => setAcceptTerms(e.target.checked)}
            className="mt-1 size-4 shrink-0 rounded border-border accent-merlot"
            required
          />
          <span>{TNC}</span>
        </label>
      </fieldset>

      {error && (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      <Button type="submit" disabled={submitting} className="w-full py-2.5">
        {submitting ? "Mengirim…" : "Kirim"}
      </Button>
    </form>
  );
}

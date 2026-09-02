"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button, Select } from "@/components/ui";
import { DatePicker } from "@/components/date-picker";
import { CityCombobox } from "@/components/leads/city-combobox";
import {
  COUNTRY_DIAL_CODES,
  DEFAULT_COUNTRY_DIAL,
} from "@/lib/country-codes";
import type { FormField, FormPageCopy } from "@/lib/form-templates";

const fieldClass =
  "mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-merlot focus:ring-2 focus:ring-merlot/20";

/**
 * One rendered form field. Shared by the public form and the builder preview so
 * designers always see exactly what visitors get.
 */
export const LeadFormField = React.memo(function LeadFormField({
  field,
  value,
  countryCode,
  acceptTerms,
  onValue,
  onCountryCode,
  onAcceptTerms,
}: {
  field: FormField;
  value: string | boolean | undefined;
  countryCode: string;
  acceptTerms: boolean;
  onValue: (key: string, value: string | boolean) => void;
  onCountryCode: (value: string) => void;
  onAcceptTerms: (value: boolean) => void;
}) {
  if (field.type === "terms") {
    return (
      <fieldset className="rounded-lg border border-border bg-surface-muted/60 p-4">
        <legend className="px-1 text-sm font-semibold text-foreground">
          {field.label}
        </legend>
        <label className="flex cursor-pointer gap-3 text-sm leading-relaxed text-foreground">
          <input
            type="checkbox"
            checked={acceptTerms}
            onChange={(e) => onAcceptTerms(e.target.checked)}
            className="mt-1 size-4 shrink-0 rounded border-border accent-merlot"
            required={field.required}
          />
          <span>{field.termsText}</span>
        </label>
      </fieldset>
    );
  }

  if (field.type === "phone") {
    return (
      <div>
        <label
          htmlFor={field.id}
          className="text-sm font-medium text-foreground"
        >
          {field.label}
        </label>
        <div className="mt-1.5 flex gap-2">
          <label htmlFor={`${field.id}-cc`} className="sr-only">
            Kode negara
          </label>
          <Select
            id={`${field.id}-cc`}
            name="countryCode"
            value={countryCode}
            onChange={onCountryCode}
            className="w-[9.5rem] shrink-0 sm:w-44"
            options={COUNTRY_DIAL_CODES.map((c) => ({
              value: c.dial,
              label: `${c.iso} +${c.dial}`,
            }))}
          />
          <input
            id={field.id}
            name={field.key}
            type="tel"
            required={field.required}
            autoComplete="tel-national"
            inputMode="numeric"
            value={String(value ?? "")}
            onChange={(e) => onValue(field.key, e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-merlot focus:ring-2 focus:ring-merlot/20"
            placeholder={
              field.placeholder ||
              (countryCode === "62" ? "812xxxxxxxx" : "Nomor tanpa kode negara")
            }
          />
        </div>
        {field.helpText ? (
          <p className="mt-1 text-xs text-muted">{field.helpText}</p>
        ) : null}
      </div>
    );
  }

  if (field.type === "city") {
    return (
      <div>
        <label
          htmlFor={field.id}
          className="text-sm font-medium text-foreground"
        >
          {field.label}{" "}
          {!field.required ? (
            <span className="font-normal text-muted">(Opsional)</span>
          ) : null}
        </label>
        <CityCombobox
          id={field.id}
          value={String(value ?? "")}
          onChange={(v) => onValue(field.key, v)}
        />
        {field.helpText ? (
          <p className="mt-1 text-xs text-muted">{field.helpText}</p>
        ) : null}
      </div>
    );
  }

  if (field.type === "checkbox") {
    return (
      <label className="flex cursor-pointer gap-3 text-sm leading-relaxed text-foreground">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onValue(field.key, e.target.checked)}
          className="mt-1 size-4 shrink-0 rounded border-border accent-merlot"
          required={field.required}
        />
        <span>{field.helpText || field.label}</span>
      </label>
    );
  }

  if (field.type === "select") {
    return (
      <div>
        <label
          htmlFor={field.id}
          className="text-sm font-medium text-foreground"
        >
          {field.label}
          {!field.required ? (
            <span className="font-normal text-muted"> (Opsional)</span>
          ) : null}
        </label>
        <Select
          id={field.id}
          name={field.key}
          required={field.required}
          value={String(value ?? "")}
          onChange={(v) => onValue(field.key, v)}
          className="mt-1.5 w-full"
          placeholder="Pilih…"
          options={[
            { value: "", label: "Pilih…" },
            ...(field.options ?? []).map((o) => ({
              value: o.value,
              label: o.label,
            })),
          ]}
        />
        {field.helpText ? (
          <p className="mt-1 text-xs text-muted">{field.helpText}</p>
        ) : null}
      </div>
    );
  }

  if (field.type === "date") {
    return (
      <div>
        <label htmlFor={field.id} className="text-sm font-medium text-foreground">
          {field.label}
          {!field.required ? (
            <span className="font-normal text-muted"> (Opsional)</span>
          ) : null}
        </label>
        <DatePicker
          name={field.key}
          value={String(value ?? "")}
          onChange={(iso) => onValue(field.key, iso)}
          max={new Date().toISOString().slice(0, 10)}
          className="mt-1.5"
          placeholder="dd/mm/yyyy"
        />
        {field.helpText ? (
          <p className="mt-1 text-xs text-muted">{field.helpText}</p>
        ) : null}
      </div>
    );
  }

  if (field.type === "textarea") {
    return (
      <div>
        <label
          htmlFor={field.id}
          className="text-sm font-medium text-foreground"
        >
          {field.label}
          {!field.required ? (
            <span className="font-normal text-muted"> (Opsional)</span>
          ) : null}
        </label>
        <textarea
          id={field.id}
          name={field.key}
          required={field.required}
          value={String(value ?? "")}
          onChange={(e) => onValue(field.key, e.target.value)}
          className={`${fieldClass} min-h-[88px] resize-y`}
          placeholder={field.placeholder}
        />
        {field.helpText ? (
          <p className="mt-1 text-xs text-muted">{field.helpText}</p>
        ) : null}
      </div>
    );
  }

  const inputType = field.type === "email" ? "email" : "text";

  return (
    <div>
      <label htmlFor={field.id} className="text-sm font-medium text-foreground">
        {field.label}
        {!field.required ? (
          <span className="font-normal text-muted"> (Opsional)</span>
        ) : null}
      </label>
      <input
        id={field.id}
        name={field.key}
        type={inputType}
        required={field.required}
        autoComplete={
          field.key === "name"
            ? "name"
            : field.key === "email"
              ? "email"
              : undefined
        }
        value={String(value ?? "")}
        onChange={(e) => onValue(field.key, e.target.value)}
        className={fieldClass}
        placeholder={field.placeholder}
      />
      {field.helpText ? (
        <p className="mt-1 text-xs text-muted">{field.helpText}</p>
      ) : null}
    </div>
  );
});

export function LeadForm({
  fields,
  submitLabel = "Kirim",
  preview = false,
  wrapField,
}: {
  fields: FormField[];
  formPage?: FormPageCopy;
  submitLabel?: string;
  /** Builder preview: nothing is submitted and native validation is skipped. */
  preview?: boolean;
  /** Lets the builder wrap each field with a selection affordance. */
  wrapField?: (field: FormField, node: React.ReactNode) => React.ReactNode;
}) {
  const router = useRouter();
  const [values, setValues] = React.useState<Record<string, string | boolean>>(
    {},
  );
  const [countryCode, setCountryCode] = React.useState(DEFAULT_COUNTRY_DIAL);
  const [acceptTerms, setAcceptTerms] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const setValue = React.useCallback((key: string, value: string | boolean) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (preview) return;
    setError(null);

    const termsField = fields.find((f) => f.key === "terms");
    if (termsField && !acceptTerms) {
      setError("Anda harus menyetujui pernyataan Privasi Data.");
      return;
    }
    const missingDate = fields.find(
      (f) => f.type === "date" && f.required && !String(values[f.key] ?? "").trim(),
    );
    if (missingDate) {
      setError(`${missingDate.label} wajib diisi.`);
      return;
    }

    setSubmitting(true);
    try {
      const payloadValues: Record<string, unknown> = {
        ...values,
        acceptTerms,
        countryCode,
      };
      const res = await fetch("/api/public/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          acceptTerms,
          countryCode,
          values: payloadValues,
          // Back-compat flat fields for older clients
          name: values.name,
          birthDate: values.birthDate,
          phone: values.phone,
          email: values.email,
          city: values.city,
        }),
      });
      const json = (await res.json().catch(() => null)) as
        | { ok?: boolean; error?: string; discountCode?: string }
        | null;

      if (!res.ok || !json?.ok) {
        setError(json?.error ?? "Gagal mengirim formulir. Coba lagi.");
        return;
      }

      const code = json.discountCode?.trim();
      router.push(
        code
          ? `/daftar/terima-kasih?code=${encodeURIComponent(code)}`
          : "/daftar/terima-kasih",
      );
    } catch {
      setError("Gagal mengirim formulir. Periksa koneksi Anda.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate={preview} className="space-y-4">
      {fields.map((field) => {
        const node = (
          <LeadFormField
            key={field.id}
            field={field}
            value={values[field.key]}
            countryCode={countryCode}
            acceptTerms={acceptTerms}
            onValue={setValue}
            onCountryCode={setCountryCode}
            onAcceptTerms={setAcceptTerms}
          />
        );
        return wrapField ? wrapField(field, node) : node;
      })}

      {error && !preview && (
        <p
          className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger"
          role="alert"
        >
          {error}
        </p>
      )}

      <Button type="submit" disabled={submitting} className="w-full py-2.5">
        {submitting ? "Mengirim…" : submitLabel}
      </Button>
    </form>
  );
}

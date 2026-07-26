"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui";
import { formatIDR } from "@/lib/format";

type CheckoutItem = {
  sku: string;
  name: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
};

type SavedAddress = {
  recipientName: string;
  recipientPhone: string;
  line1: string;
  district: string;
  city: string;
  province: string;
  postalCode: string;
};

type Rate = {
  courier: string;
  service: string;
  description: string;
  cost: number;
  etd: string;
};

type OrderPayload = {
  code: string;
  subtotal: number;
  shippingCost: number;
  total: number;
  items: CheckoutItem[];
  expired: boolean;
  alreadyPaid: boolean;
  paymentLink: string | null;
  customer: { name: string; phone: string };
  savedAddress: SavedAddress | null;
};

const fieldClass =
  "mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-merlot focus:ring-2 focus:ring-merlot/20";

function rateKey(r: Rate) {
  return `${r.courier}::${r.service}`;
}

export function CheckoutForm({ token }: { token: string }) {
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<OrderPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [line1, setLine1] = useState("");
  const [district, setDistrict] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [editingAddress, setEditingAddress] = useState(true);

  const [rates, setRates] = useState<Rate[]>([]);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [selectedRate, setSelectedRate] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/public/checkout?token=${encodeURIComponent(token)}`);
        const json = (await res.json().catch(() => null)) as
          | { ok?: boolean; error?: string; order?: OrderPayload }
          | null;
        if (!res.ok || !json?.ok || !json.order) {
          if (!cancelled) setError(json?.error ?? "Link checkout tidak valid.");
          return;
        }
        if (cancelled) return;
        setOrder(json.order);
        setName(json.order.customer.name || "");
        setPhone(json.order.customer.phone || "");
        const addr = json.order.savedAddress;
        if (addr) {
          setRecipientName(addr.recipientName);
          setRecipientPhone(addr.recipientPhone || json.order.customer.phone || "");
          setLine1(addr.line1);
          setDistrict(addr.district);
          setCity(addr.city);
          setProvince(addr.province);
          setPostalCode(addr.postalCode);
          setEditingAddress(false);
          // Prefetch rates for saved address.
          if (addr.postalCode.replace(/\D/g, "").length >= 5) {
            void (async () => {
              setRatesLoading(true);
              try {
                const ratesRes = await fetch("/api/public/checkout/rates", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    token,
                    postalCode: addr.postalCode,
                  }),
                });
                const ratesJson = (await ratesRes.json().catch(() => null)) as
                  | { ok?: boolean; rates?: Rate[] }
                  | null;
                if (ratesRes.ok && ratesJson?.ok) {
                  setRates(ratesJson.rates ?? []);
                }
              } finally {
                setRatesLoading(false);
              }
            })();
          }
        } else {
          setRecipientName(json.order.customer.name || "");
          setRecipientPhone(json.order.customer.phone || "");
          setEditingAddress(true);
        }
      } catch {
        if (!cancelled) setError("Gagal memuat checkout. Periksa koneksi Anda.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const loadRates = useCallback(async () => {
    if (!postalCode || postalCode.replace(/\D/g, "").length < 5) {
      setError("Isi kode pos yang valid untuk melihat ongkir.");
      return;
    }
    setRatesLoading(true);
    setError(null);
    setSelectedRate("");
    try {
      const res = await fetch("/api/public/checkout/rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, postalCode }),
      });
      const json = (await res.json().catch(() => null)) as
        | { ok?: boolean; error?: string; rates?: Rate[] }
        | null;
      if (!res.ok || !json?.ok) {
        setError(json?.error ?? "Gagal memuat ongkir.");
        setRates([]);
        return;
      }
      setRates(json.rates ?? []);
      if ((json.rates ?? []).length === 0) {
        setError("Tidak ada kurir untuk kode pos ini.");
      }
    } catch {
      setError("Gagal memuat ongkir. Periksa koneksi Anda.");
    } finally {
      setRatesLoading(false);
    }
  }, [postalCode, token]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!order || order.expired || order.alreadyPaid) return;
    const rate = rates.find((r) => rateKey(r) === selectedRate);
    if (!rate) {
      setError("Pilih kurir pengiriman terlebih dahulu.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/public/checkout/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          name,
          phone,
          courier: rate.courier,
          service: rate.service,
          shippingCost: rate.cost,
          address: {
            recipientName,
            recipientPhone,
            line1,
            district,
            city,
            province,
            postalCode,
          },
        }),
      });
      const json = (await res.json().catch(() => null)) as
        | {
            ok?: boolean;
            error?: string;
            paymentUrl?: string | null;
            alreadyPaid?: boolean;
          }
        | null;

      if (!res.ok || !json?.ok) {
        setError(json?.error ?? "Gagal menyelesaikan checkout.");
        return;
      }

      if (json.paymentUrl) {
        window.location.href = json.paymentUrl;
        return;
      }

      setError("Link pembayaran tidak tersedia. Hubungi CS via WhatsApp.");
    } catch {
      setError("Gagal menyelesaikan checkout. Periksa koneksi Anda.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted">Memuat pesanan…</p>;
  }

  if (!order) {
    return (
      <p className="text-sm text-red-700">
        {error ?? "Link checkout tidak valid atau sudah tidak tersedia."}
      </p>
    );
  }

  if (order.expired) {
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">Link kedaluwarsa</p>
        <p className="text-sm text-muted">
          Link checkout untuk pesanan {order.code} sudah tidak berlaku. Kirim ulang
          keranjang dari WhatsApp untuk mendapatkan link baru.
        </p>
      </div>
    );
  }

  if (order.alreadyPaid) {
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">Pesanan sudah dibayar</p>
        <p className="text-sm text-muted">
          Terima kasih — pesanan {order.code} sudah kami terima. Cek WhatsApp untuk
          konfirmasi / struk.
        </p>
      </div>
    );
  }

  const selected = rates.find((r) => rateKey(r) === selectedRate);
  const shippingCost = selected?.cost ?? 0;
  const total = order.subtotal + shippingCost;

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <section>
        <h2 className="text-sm font-semibold text-foreground">
          Pesanan {order.code}
        </h2>
        <ul className="mt-3 space-y-2">
          {order.items.map((it) => (
            <li
              key={`${it.sku}-${it.name}`}
              className="flex items-start justify-between gap-3 text-sm"
            >
              <span className="text-foreground">
                {it.name}{" "}
                <span className="text-muted">×{it.qty}</span>
              </span>
              <span className="shrink-0 tabular-nums text-foreground">
                {formatIDR(it.lineTotal)}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex justify-between border-t border-border pt-3 text-sm">
          <span className="text-muted">Subtotal</span>
          <span className="tabular-nums font-medium">{formatIDR(order.subtotal)}</span>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Data pemesan</h2>
        <div>
          <label htmlFor="name" className="text-sm font-medium text-foreground">
            Nama
          </label>
          <input
            id="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={fieldClass}
            autoComplete="name"
          />
        </div>
        <div>
          <label htmlFor="phone" className="text-sm font-medium text-foreground">
            Nomor telepon
          </label>
          <input
            id="phone"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={fieldClass}
            autoComplete="tel"
            inputMode="tel"
          />
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">Alamat pengiriman</h2>
          {order.savedAddress && !editingAddress ? (
            <button
              type="button"
              className="text-xs font-medium text-merlot hover:underline"
              onClick={() => setEditingAddress(true)}
            >
              Ubah
            </button>
          ) : null}
        </div>

        {!editingAddress && order.savedAddress ? (
          <div className="rounded-lg border border-border bg-background/60 px-3 py-3 text-sm text-foreground">
            <p className="font-medium">{recipientName}</p>
            <p className="text-muted">{recipientPhone}</p>
            <p className="mt-1">
              {line1}
              {district ? `, ${district}` : ""}
            </p>
            <p>
              {city}
              {province ? `, ${province}` : ""} {postalCode}
            </p>
            <p className="mt-2 text-xs text-muted">
              Konfirmasi alamat tersimpan, lalu pilih kurir di bawah.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label htmlFor="recipientName" className="text-sm font-medium">
                Nama penerima
              </label>
              <input
                id="recipientName"
                required
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                className={fieldClass}
              />
            </div>
            <div>
              <label htmlFor="recipientPhone" className="text-sm font-medium">
                Telepon penerima
              </label>
              <input
                id="recipientPhone"
                required
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
                className={fieldClass}
                inputMode="tel"
              />
            </div>
            <div>
              <label htmlFor="line1" className="text-sm font-medium">
                Alamat lengkap
              </label>
              <textarea
                id="line1"
                required
                rows={2}
                value={line1}
                onChange={(e) => setLine1(e.target.value)}
                className={fieldClass}
                placeholder="Nama jalan, nomor rumah, patokan"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="district" className="text-sm font-medium">
                  Kecamatan
                </label>
                <input
                  id="district"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className={fieldClass}
                />
              </div>
              <div>
                <label htmlFor="postalCode" className="text-sm font-medium">
                  Kode pos
                </label>
                <input
                  id="postalCode"
                  required
                  value={postalCode}
                  onChange={(e) => {
                    setPostalCode(e.target.value);
                    setRates([]);
                    setSelectedRate("");
                  }}
                  className={fieldClass}
                  inputMode="numeric"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="city" className="text-sm font-medium">
                  Kota
                </label>
                <input
                  id="city"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className={fieldClass}
                />
              </div>
              <div>
                <label htmlFor="province" className="text-sm font-medium">
                  Provinsi
                </label>
                <input
                  id="province"
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  className={fieldClass}
                />
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">Pengiriman</h2>
          <Button
            type="button"
            variant="secondary"
            className="!px-2.5 !py-1.5 text-xs"
            disabled={ratesLoading}
            onClick={() => void loadRates()}
          >
            {ratesLoading ? "Memuat…" : "Cek ongkir"}
          </Button>
        </div>

        {rates.length > 0 ? (
          <ul className="space-y-2">
            {rates.map((r) => {
              const key = rateKey(r);
              const checked = selectedRate === key;
              return (
                <li key={key}>
                  <label
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 text-sm transition ${
                      checked
                        ? "border-merlot bg-merlot/5"
                        : "border-border hover:border-merlot/40"
                    }`}
                  >
                    <input
                      type="radio"
                      name="courier"
                      className="mt-1"
                      checked={checked}
                      onChange={() => setSelectedRate(key)}
                    />
                    <span className="flex-1">
                      <span className="font-medium text-foreground">
                        {r.courier} · {r.description || r.service}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted">
                        Estimasi {r.etd || "—"}
                      </span>
                    </span>
                    <span className="tabular-nums font-medium">{formatIDR(r.cost)}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-xs text-muted">
            Isi / konfirmasi kode pos, lalu tekan &quot;Cek ongkir&quot;.
          </p>
        )}
      </section>

      <section className="space-y-2 border-t border-border pt-4">
        <div className="flex justify-between text-sm">
          <span className="text-muted">Ongkir</span>
          <span className="tabular-nums">{formatIDR(shippingCost)}</span>
        </div>
        <div className="flex justify-between text-sm font-semibold">
          <span>Total</span>
          <span className="tabular-nums">{formatIDR(total)}</span>
        </div>
      </section>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <Button type="submit" className="w-full" disabled={submitting || !selected}>
        {submitting ? "Menyiapkan pembayaran…" : "Bayar sekarang"}
      </Button>
      <p className="text-center text-xs text-muted">
        Anda akan diarahkan ke halaman pembayaran Midtrans.
      </p>
    </form>
  );
}

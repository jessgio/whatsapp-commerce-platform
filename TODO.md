# Belum di-fix — go-live Oktober

Target commercial: WhatsApp commerce live **Oktober**. CS/sales jawab dari web CRM, bukan HP. Saat ini masih tahap **kumpulin data** (form daftar → simpan nomor + email).

## Blocker go-live

- [ ] **Permanent WhatsApp Cloud API token**
  - Token system user Meta belum di-generate. Akun admin Meta belum 7 hari (restriction Meta, bukan kerjaan app).
  - Tanpa ini, inbox/webhook production tidak bisa kirim/terima chat beneran (`WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, webhook `/api/webhooks/whatsapp`).
  - Setelah akun eligible: buat system user token, isi env, pasang webhook verify + app secret.

- [x] **CS routing**
  - Auto-assign least-loaded ke CS (fallback sales kalau belum ada user CS).
  - Sticky: chat yang sudah punya owner tidak di-reassign saat pesan baru masuk.
  - Manual assign / claim / unassign di inbox web; claim di app mobile.
  - Filter Mine + Unassigned; tombol **Route N** untuk drain antrian unassigned (bisa dites di demo mode tanpa token Meta).
  - Webhook inbound memanggil routing yang sama begitu WA live.

## Shipping / Biteship (kode sudah, ops tinggal pasang)

Kode: webhook `POST /api/webhooks/shipping` → update CRM + forward ke packing lama. Halaman Shipments overlay status live Biteship.

- [x] Map status Biteship → CRM + badge/timeline di `/shipments`
- [x] Retrieve order live (`GET /v1/orders/:id`) overlay di board
- [x] Webhook inbound: verifikasi `X-Biteship-Webhook-Token` = `BITESHIP_WEBHOOK_SECRET`
- [x] Handshake Biteship: POST body kosong / `{}` → `200` (tanpa signature), supaya dashboard bisa simpan URL
- [x] Fan-out payload ke `BITESHIP_WEBHOOK_FORWARD_URL` (packing) dengan header packing
- [x] Env di `.env.example`: `BITESHIP_WEBHOOK_SECRET`, `BITESHIP_WEBHOOK_FORWARD_URL`, `BITESHIP_WEBHOOK_SIGNATURE_KEY`, `BITESHIP_WEBHOOK_SIGNATURE_SECRET`
- [ ] Vercel CRM: isi 4 env di atas (Production + Preview) lalu **redeploy**
- [ ] Vercel packing: rotate `BITESHIP_WEBHOOK_SIGNATURE_KEY` / `_SECRET` (Sensitive, tidak bisa copy) — nilai **sama** dengan CRM
- [ ] Dashboard Biteship: **satu** webhook saja ke `https://whatsapp.aerisbeaute.com/api/webhooks/shipping` (`order.status` + `order.waybill_id`, header `X-Biteship-Webhook-Token`). Hapus/ganti yang lama (event tidak boleh dobel)
- [ ] Cek Events Log Biteship: `200` = jalan; `403` secret/header salah; packing 403 = signature packing belum match

## Belum dimulai (bukan blocker Oktober)

- [ ] **AI layer (FAQ)**
  - Belum ada sama sekali di repo.
  - Idealnya jawab otomatis: harga barang, package tracking, FAQ umum — sisanya escalate ke CS.

## Yang sudah jalan (data gathering)

- Form publik (`/daftar`) + `/api/public/leads`: simpan nama, nomor WA, email, consent.
- Lead welcome email.
- Portal CRM/OMS/WMS/inbox sudah ada di kode, tapi **belum live buat CS** sampai token Meta selesai.
- CS routing sudah bisa dipakai di demo (login sebagai CS → Inbox).

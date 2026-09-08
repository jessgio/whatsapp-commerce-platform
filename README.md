# Merlot — WhatsApp Commerce Platform

Internal platform unifying **CRM + OMS + WMS** around **WhatsApp Business (Cloud API)**,
with catalog/pricing push, Midtrans/Xendit payment links, Biteship 3PL shipping,
role-based logins, and sales/CS dashboards. Built with Next.js (App Router) +
Supabase + Tailwind, styled with the **Merlot Charm** palette.

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:3000. With no `.env.local`, the app runs in **demo mode** —
pick a role on the login screen (Admin / Sales / CS / Warehouse) to explore the
full portal with realistic sample data. All external integrations are mocked.

## Modes

| Mode | When | Data | Integrations |
| --- | --- | --- | --- |
| **Demo** | no Supabase env | in-memory sample data | mocked (logged) |
| **Live** | Supabase env set | Postgres (RLS) | real API calls |

Copy `.env.example` → `.env.local` and fill in credentials to go live.

## Go live

1. Create a Supabase project; set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
2. Apply schema: run `supabase/migrations/0001_schema.sql`, `0002_rls.sql`, `0003_functions.sql` (and later migrations as needed).
3. (Optional) Load scale test data: `supabase/seed.sql` (15,000 customers).
4. **Google staff login** (recommended):
   - In [Google Cloud Console](https://console.cloud.google.com/auth/clients), create a **Web** OAuth client.
   - Authorized JavaScript origins: your production origin and `http://localhost:3000`.
   - Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback` (shown on Supabase → Authentication → Providers → Google).
   - In Supabase, enable the **Google** provider and paste the Client ID + Client Secret.
   - Under Authentication → URL Configuration, add redirect allow-list entries:
     - `http://localhost:3000/auth/callback`
     - `https://<your-production-host>/auth/callback`
   - If Aeris uses Google Workspace for `aerisbeaute.com`, set the OAuth app Audience to **Internal** so only Workspace users can consent. The app also rejects non-`@aerisbeaute.com` emails in `/auth/callback`.
5. Add WhatsApp Cloud API, payment, and Biteship credentials.
6. Point provider webhooks at:
   - WhatsApp: `/api/webhooks/whatsapp` (verify token = `WHATSAPP_WEBHOOK_VERIFY_TOKEN`)
   - Payments: `/api/webhooks/payment`
   - Shipping: `/api/webhooks/shipping` — see [Biteship webhook](#biteship-webhook) below
7. Deploy to Vercel. After changing env vars, **Redeploy** production — new keys are not picked up by a running deployment.
8. Set Cloudflare Turnstile keys on Vercel (`NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`). Add the staff host (e.g. `whatsapp.aerisbeaute.com`) on the widget’s hostname list — used on login/signup only.

## Biteship webhook

Production host: `https://whatsapp.aerisbeaute.com`. Handler: `src/app/api/webhooks/shipping/route.ts`.

Biteship allows **one URL per event**. Do not create a second webhook for `order.status` / `order.waybill_id` — edit or replace **Aeris Marketing Order Status** (it pointed at the packing app).

### Dashboard form

| Field | Value |
| --- | --- |
| URL | `https://whatsapp.aerisbeaute.com/api/webhooks/shipping` |
| Events | `order.status`, `order.waybill_id` (skip `order.price`) |
| Header key | `X-Biteship-Webhook-Token` |
| Header secret | same value as `BITESHIP_WEBHOOK_SECRET` |

Saving the webhook sends `GET` and an empty `application/json` POST **without** a signature. Both must return `{ "ok": true }`. Real order events still require the token.

After a verified delivery the handler updates the CRM `shipments` row (when `biteship_order_id` matches) and **forwards** the same JSON to the legacy packing app.

### Vercel env (this project)

Set on **Production and Preview**, then redeploy.

| Env | Purpose |
| --- | --- |
| `BITESHIP_API_KEY` | Create / retrieve orders |
| `BITESHIP_WEBHOOK_SECRET` | Inbound auth (`X-Biteship-Webhook-Token`). Missing → `503` and log `BITESHIP_WEBHOOK_SECRET is not set` |
| `BITESHIP_WEBHOOK_FORWARD_URL` | `https://offline-sales-packing.vercel.app/api/biteship/webhook` |
| `BITESHIP_WEBHOOK_SIGNATURE_KEY` | Header **name** packing expects (e.g. `X-Biteship-Signature`) |
| `BITESHIP_WEBHOOK_SIGNATURE_SECRET` | Header **value** packing expects |

Packing’s Vercel secrets may be **Sensitive** (Copy disabled). Rotate: set a new key/secret on packing, put the same pair here, redeploy packing, and switch the Biteship URL to this app in the same window. Unknown CRM shipments still return `200` when a forward URL is set, so packing-only orders are not retried.

### Troubleshooting

| Response / log | Meaning |
| --- | --- |
| `200` `{ "ok": true }` on empty POST | Install probe — URL can be saved |
| `403` `bad signature` | Token header ≠ `BITESHIP_WEBHOOK_SECRET` |
| `503` `not configured` | `BITESHIP_WEBHOOK_SECRET` missing on that deployment — add env and redeploy |
| Packing `403` on forward | Rotate packing signature env so it matches CRM |

**Shipments** lists CRM rows booked from Warehouse **Generate label**, then overlays live Biteship retrieve-order status. Empty list is expected until an order is packed. `BITESHIP_TEST_*` IDs are only for Biteship API activation, not the UI.

## Mobile field app (Expo Go)

Phone-friendly portal inbox/orders (responsive web), plus an Expo Go app in [`mobile/`](mobile/) for CS/sales in the field. The app calls authenticated `/api/staff/*` routes. See [`mobile/README.md`](mobile/README.md).

```bash
# Local Expo demo auth (optional): STAFF_API_ALLOW_DEMO=true
npm run dev          # portal + staff API
npm run mobile       # Expo Go (from repo root)
node scripts/smoke-staff-api.mjs   # API smoke (needs STAFF_API_ALLOW_DEMO or demo mode)
```

## Customers

Staff list: **Customers**. Import Excel from **Import contacts**; template at `/customers/import-template`.

| Source | How they get in | Tag (DB) | UI chip | Consent |
| --- | --- | --- | --- | --- |
| **Internal** | Excel import | `internal` (older rows may still have `imported`) | Internal | stays **pending** — import does not opt anyone in |
| **Voucher** | QR form `/daftar` | `qr_lead` | Voucher | **opted in** via `web_form` |
| **Form Digital** | Share link `/f/[slug]` | `form_digital` | Form Digital | **opted in** via `web_form` |

Filter the list with **All sources / Internal / Voucher / Form Digital**. Extra labels from the Excel `tags` column (e.g. `vip`) show next to the source chip. Matching is by phone (`wa_id`); existing rows are updated and also stamped Internal. Someone who was imported and later submitted `/daftar` shows both chips.

**Form Digital** (Design → Form templates) is a fully custom copy of the QR lead form for social media. Each library template gets a unique public slug (`/f/fd…`), optional link expiry (end of that day, Asia/Jakarta), and a downloadable QR with `aeris-mark-512.png` in the center. Unpublished or expired links reject both GET and POST. The system QR funnel on `/daftar` is unchanged.

## Cloudflare Turnstile

Protects staff **login** and **signup** only (not the public `/daftar` form). The widget sits above Submit; the server action verifies the token with Cloudflare before continuing.

| Environment | Site key | Secret |
| --- | --- | --- |
| **Production** (Vercel) | `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | `TURNSTILE_SECRET_KEY` |
| **Localhost** (`npm run dev`, or `next start` off Vercel) | Cloudflare dummy `1x00000000000000000000AA` (always passes) | matching dummy secret |

Dummy keys are [Cloudflare’s documented test pair](https://developers.cloudflare.com/turnstile/troubleshooting/testing/). Override with `TURNSTILE_USE_TEST_KEYS=true|false` if you need to force one mode. Hostname list in the Turnstile dashboard must include production (e.g. `join.aerisbeaute.com`); localhost does not need to be allowlisted because dummy keys are used instead.

## Modules

- **CRM** — customers keyed off `wa_id`, consent ledger, saved addresses (reused per order), segments, profiles. Import vs voucher source tags as above.
- **Inbox** — live WhatsApp conversations, least-loaded CS routing, assignment/claim, 24h-window indicator, reply composer (mobile list↔thread).
- **Catalog & Pricing** — SKUs, prices, discounts, push to WhatsApp catalog.
- **Orders (OMS)** — WA-cart & agent orders, lifecycle, payment links, issue flags, warehouse notices.
- **Warehouse (WMS)** — fulfillment queue, stock health, notices.
- **Pack Station** — auto-generated shipping labels with scannable AWB barcode, scan-to-pack flow (scan label → sequential per-product barcode scanning with quantity tracking), timestamped + attributed scan log, and a downloadable throughput/accountability report (summary + scan-level CSV).
- **Shipments** — Biteship rates, live retrieve-order status/timeline, tracking webhook + fan-out to the legacy packing app.
- **Dashboards** — sales (revenue, growing/declining SKUs, retention) and CS (cases, chats, response time).
- **Settings** — integration status, team, RBAC matrix, theme.

## Architecture notes

- `src/lib/data/repo.ts` — single data-access facade (demo ↔ Supabase). UI imports only from here.
- `src/lib/integrations/*` — WhatsApp, payments, shipping, catalog adapters (real calls + mock fallback).
- `src/lib/rbac.ts` — role → permission matrix; enforced via `requirePermission()` and RLS.
- `src/proxy.ts` — auth gating + Supabase session refresh.

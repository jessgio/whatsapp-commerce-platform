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
7. Deploy to Vercel. Set the Biteship webhook env vars on Vercel (Production + Preview) and redeploy so they take effect.

## Biteship webhook

Biteship allows **one URL per event** (`order.status`, `order.waybill_id`). Point the dashboard webhook at this app; do not create a second webhook for the same events.

| Field | Value |
| --- | --- |
| URL | `https://<production-host>/api/webhooks/shipping` |
| Events | `order.status`, `order.waybill_id` (`order.price` is unused) |
| Header key | `X-Biteship-Webhook-Token` |
| Header secret | same value as `BITESHIP_WEBHOOK_SECRET` |

When you click save in the Biteship dashboard, they POST an empty `application/json` body (no signature) and expect `{ "ok": true }`. Real `order.status` / `order.waybill_id` payloads still require `X-Biteship-Webhook-Token`.

After a verified delivery, the handler updates the CRM `shipments` row (when `biteship_order_id` matches) and **forwards** the same JSON to the legacy packing app so offline packing keeps getting status updates.

| Env (this Vercel project) | Purpose |
| --- | --- |
| `BITESHIP_API_KEY` | Create/track orders (already required) |
| `BITESHIP_WEBHOOK_SECRET` | Inbound auth (`X-Biteship-Webhook-Token`) |
| `BITESHIP_WEBHOOK_FORWARD_URL` | Packing fan-out, e.g. `https://offline-sales-packing.vercel.app/api/biteship/webhook` |
| `BITESHIP_WEBHOOK_SIGNATURE_KEY` | Header **name** packing expects (e.g. `X-Biteship-Signature`) |
| `BITESHIP_WEBHOOK_SIGNATURE_SECRET` | Header **value** packing expects |

Packing’s Vercel secrets may be **Sensitive** (not copyable). Rotate them: set a new key/secret on packing, copy the same pair here, redeploy packing, and switch the Biteship URL to this app in the same window. Unknown CRM shipments still return `200` when a forward URL is set, so packing-only orders are not retried.

The **Shipments** page lists CRM rows booked from Warehouse **Generate label** and overlays live Biteship retrieve-order status. Test order IDs (`BITESHIP_TEST_*`) are only for API activation, not production.

## Mobile field app (Expo Go)

Phone-friendly portal inbox/orders (responsive web), plus an Expo Go app in [`mobile/`](mobile/) for CS/sales in the field. The app calls authenticated `/api/staff/*` routes. See [`mobile/README.md`](mobile/README.md).

```bash
# Local Expo demo auth (optional): STAFF_API_ALLOW_DEMO=true
npm run dev          # portal + staff API
npm run mobile       # Expo Go (from repo root)
node scripts/smoke-staff-api.mjs   # API smoke (needs STAFF_API_ALLOW_DEMO or demo mode)
```

## Modules

- **CRM** — customers keyed off `wa_id`, consent ledger, saved addresses (reused per order), segments, profiles.
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

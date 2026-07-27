# Aeris Field (Expo Go)

Internal mobile app for CS/sales: WhatsApp inbox replies and order checking/actions.
Talks to the Next.js portal via authenticated `/api/staff/*` routes.

## Prerequisites

1. Portal running (`npm run dev` from the repo root) on a URL the phone can reach.
2. [Expo Go](https://expo.dev/go) on your phone (**SDK 54** — this app targets Expo SDK 54).
3. Either:
   - **Live:** Supabase staff account (`@aerisbeaute.com` email/password), or
   - **Demo:** set `STAFF_API_ALLOW_DEMO=true` on the Next server (or run without Supabase env) and `EXPO_PUBLIC_DEMO_LOGIN=true` in `mobile/.env`.

## Setup

```bash
# Terminal 1 — portal + staff API (demo auth allowed for local Expo)
set STAFF_API_ALLOW_DEMO=true
npm run dev

# Terminal 2 — Expo
cd mobile
cp .env.example .env
# EXPO_PUBLIC_API_URL=http://<lan-ip>:3000
# EXPO_PUBLIC_DEMO_LOGIN=true   # or set Supabase URL/anon for live login
npm install
npm start
```

Scan the QR code with Expo Go.

### Device networking

| Where you run Expo | `EXPO_PUBLIC_API_URL` |
| --- | --- |
| Emulator / same machine | `http://localhost:3000` (Android emulator: `http://10.0.2.2:3000`) |
| Physical phone (Expo Go) | `http://<your-lan-ip>:3000` |
| Staging / production | `https://your-portal-host` |

## Features

- Sign in (email/password or demo roles)
- Inbox list + thread + reply (`inbox.view` / `inbox.reply`)
- Orders list + detail
- Payment link / advance status / warehouse notice when role has `orders.edit` (admin/sales)
- Polling refresh (~15–30s)

## Staff API

All requests send `Authorization: Bearer <supabase_access_token>` (or `Authorization: Demo <userId>` in demo mode).

See portal routes under `src/app/api/staff/`.

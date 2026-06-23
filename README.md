# HashWatch

Real-time Bitaxe miner monitoring app for iOS, Android, and Web.

## What it does

HashWatch tracks your Bitaxe miners from one place: hashrate, temperature, power, efficiency, uptime, shares, pool stats, and basic wallet-level portfolio tagging. It targets two use cases:

- **LAN monitoring**: discover and manage miners directly on your private network
- **Remote monitoring**: sync miners across devices through the HashWatch backend

## Features

- Live dashboard with per-miner status and chart widgets
- Local network miner discovery
- Per-miner detail views including historical charts and efficiency trends
- **Pools overview with multi-pool support (Braiins, Luxor) and change notifications**
- Analytics over 1h/24h/7d ranges
- Wallet/group tagging
- Push alerts for offline, high temp, hashrate drop, **and pool disconnect**
- Power cost input and net profit estimates
- Android home screen widget
- Remote sync across devices (offline-first with deduplication and backoff)
- Multiple themes
- Data export
- iOS and Android builds via EAS; web export support

## Tech Stack

**Frontend**

- Expo SDK 56
- React 19.2.3
- React Native 0.85.3
- TypeScript
- Zustand
- React Navigation

**Backend**

- Node.js 22
- Express
- PostgreSQL 15
- JSON Web Tokens
- WebSockets
- Expo push notifications
- Sentry error tracking

## Repository Layout

```
hashwatch/
  App.tsx
  src/                 # frontend app logic, screens, services, store
  backend/
    src/
      routes/          # REST endpoints
      services/        # business logic
      ws.ts            # WebSocket server
      db.ts            # Postgres access
      models/          # schema and initialization
    openapi.json       # API spec
  e2e/                 # Playwright E2E tests
  railway.toml         # Railway deploy config
  local-proxy.js       # optional local web proxy for LAN miner access
```

## Prerequisites

- Node.js 22
- npm
- PostgreSQL 14+ (Railway plugin available)
- EAS CLI if you want to build iOS/Android
- Expo Go or a custom dev build for mobile testing
- Railway account for production deployment

## Frontend Setup

```bash
git clone https://github.com/aktheman/hashwatch.git
cd hashwatch
cp .env.example .env
npm install
npx expo start
```

## Frontend Environment Variables

| Variable                             | Description                    |
| ------------------------------------ | ------------------------------ |
| `EXPO_PUBLIC_API_URL`                | Backend API URL                |
| `EXPO_PUBLIC_PROJECT_ID`             | Expo project ID                |
| `EXPO_PUBLIC_REVENUECAT_IOS_KEY`     | RevenueCat iOS key             |
| `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` | RevenueCat Android key         |
| `EXPO_PUBLIC_MINER_PROXY_URL`        | Miner proxy URL for web builds |

## Backend Setup

```bash
cd backend
cp .env.example .env
npm install
npm run db:init
npm run dev
```

## Backend Environment Variables

| Variable                                                  | Description                                     |
| --------------------------------------------------------- | ----------------------------------------------- |
| `PORT`                                                    | Server port, default `4000`                     |
| `DATABASE_URL`                                            | PostgreSQL connection string                    |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | fallback DB config if `DATABASE_URL` is omitted |
| `JWT_SECRET`                                              | signing secret for auth tokens                  |
| `REVENUECAT_API_KEY`                                      | RevenueCat API key                              |
| `EXPO_PUBLIC_API_URL`                                     | public API URL for CORS                         |
| `SENTRY_DSN`                                              | optional, for backend error tracking            |

OpenAPI documentation for the backend is at `backend/openapi.json`.

## Testing

- Backend: `cd backend && npx jest --no-coverage`
- Frontend: `npx jest --no-coverage`
- Typecheck: `npm run typecheck`
- E2E: `npm run test:e2e` (Playwright)
- Coverage thresholds: 78/85/90/90 (global branches/funcs/lines/stmts)

### Error tracking (Sentry)

Backend is configured with Sentry error tracking. Enable by setting `SENTRY_DSN` in backend environment variables. DSN should not be added to `.env.example`. Frontend Sentry requires Expo SDK 56+ plugin compatibility. Currently blocked by upstream issue: https://github.com/getsentry/sentry-react-native/issues/6212

## Deploy

### Railway

> One-time setup required in Railway dashboard; Railway CLI is not available in this environment due to PATH restrictions.

1. Create a new Railway project (use PostgreSQL plugin)
2. Connect this repository (root = `hashwatch/`)
3. Copy `backend/.env.example` to Railway environment variables
4. Set the following required variables:
   - `DATABASE_URL` (provided by Railway PostgreSQL plugin)
   - `JWT_SECRET` (generate a strong random value)
   - `PORT=4000`
   - `EXPO_PUBLIC_API_URL` (your public Railway domain)
   - `SENTRY_DSN` (optional, for backend error tracking)

Railway will auto-detect the backend server from `railway.toml` and start it on port 4000.

Current production backend:

- URL: https://hashwatch-production-5b6e.up.railway.app
- Health: https://hashwatch-production-5b6e.up.railway.app/api/health

Verify deployment:

```bash
curl https://hashwatch-production-5b6e.up.railway.app/api/health
```

Expected response: `{"status":"ok","db":"connected"}`.

For web builds, deploy the `dist/` output separately (Vercel/Netlify/Railway static).

### Vercel

1. Import repository in Vercel.
2. Set **Build Command** `npm run build:web` and **Output Directory** `dist`.
3. Add environment variables under Project Settings:
   - `EXPO_PUBLIC_API_URL=https://hashwatch-production-5b6e.up.railway.app`
   - `EXPO_PUBLIC_MINER_PROXY_URL` (LAN probing / proxy if used from web)
   - `EXPO_PUBLIC_REVENUECAT_IOS_KEY`
   - `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`
4. Deploy. Live URL will be `<project>.vercel.app`.

Web builds require the miner proxy for non-local miner access. See [Web and LAN Access](#web-and-lan-access).

### Minimal Environment

Set these variables in Railway or your host:

- `DATABASE_URL`
- `JWT_SECRET`
- `PORT=4000`
- `EXPO_PUBLIC_API_URL`

### Web and LAN Access

Web builds cannot reach local miner IPs directly. For web or cross-origin LAN use, run the local proxy:

```bash
node local-proxy.js
```

Then configure the proxy URL in the app's connection settings.

## Development

```bash
# frontend
npm test

# backend
cd backend && npm test

# typecheck and lint
npm run typecheck
npm run lint

# web build
npm run build:web

# mobile through EAS
eas build --platform android --profile preview
eas build --platform ios --profile preview
```

Husky and lint-staged are configured in this repo.

## Notes for Contributors

- Follow conventional commits
- Keep tests passing
- Update docs and `.env.example` when behavior/config changes
- If you change auth, proxy, remote sync, or miner-data flows, update the corresponding tests and README sections
- Multi-pool API: see `backend/openapi.json` paths `/api/miners/pools`
- Push notification schema: `backend/src/services/pushNotifications.ts`

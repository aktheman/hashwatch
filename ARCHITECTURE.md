# HashWatch Architecture

## Overview

HashWatch is an Expo/React Native application for monitoring Bitcoin ASIC miners (Bitaxe). It supports iOS, Android, web, and Electron desktop.

## Project Structure

```
src/
├── api/            # Backend API client (REST)
├── components/     # Reusable UI components
├── constants/      # App-wide constants
├── db/             # Database layer (web: localStorage, native: SQLite)
├── hooks/          # Custom React hooks
├── i18n/           # Internationalization (6 locales)
├── navigation/     # React Navigation config
├── services/       # Business logic (WebSocket, notifications, etc.)
├── store/          # Zustand state management
├── types/          # TypeScript type definitions
└── utils/          # Utility functions (formatters, health scores, etc.)
backend/            # Express.js API server
├── src/routes/     # API route handlers
├── src/services/   # Server-side business logic
└── src/__tests__/  # Backend test suite
e2e/                # Playwright end-to-end tests
public/             # PWA static assets
electron/           # Electron desktop shell
```

## Data Flow

```
┌─────────────┐     REST/WS      ┌──────────────┐
│   React     │ ◄──────────────► │   Backend    │
│   Frontend  │                  │   Express.js │
│   (Zustand) │                  │   + Postgres │
└──────┬──────┘                  └──────────────┘
       │
       ▼
┌──────────────┐
│  Local DB    │
│  (Web: LS)   │
│  (Native: SQLite) │
└──────────────┘
```

## Key Patterns

- **State Management**: Zustand stores (miners, auth, subscription, alert history)
- **Navigation**: React Navigation 7 with bottom tabs + native stack
- **Styling**: Dynamic `StyleSheet.create()` with theme-aware tokens
- **Offline**: localStorage (web) / SQLite (native) with settings queue for backend sync
- **Real-time**: WebSocket for miner updates, polling fallback (30s/5min)
- **Testing**: Jest + React Native Testing Library (frontend), Jest (backend), Playwright (E2E)
- **i18n**: react-i18next with en/es/fr/de/ja/zh locales
- **PWA**: Service worker with stale-while-revalidate caching, offline fallback

## Screens

| Screen           | Tab       | Description                                             |
| ---------------- | --------- | ------------------------------------------------------- |
| Dashboard        | Home      | Miner cards, filtering, pool recommendations, batch ops |
| Analytics        | Analytics | Hashrate charts, comparison, earnings                   |
| Pools            | Pools     | Pool management and coverage                            |
| Settings         | Settings  | Auth, theme, notifications, data retention              |
| MinerDetail      | Stack     | Per-miner stats, charts, firmware, notes                |
| Firmware         | Stack     | Batch firmware flashing, version checking               |
| DarkPool         | Stack     | Anonymous hashrate pooling (Pro)                        |
| ThemeMarketplace | Stack     | Community theme browser (Pro)                           |
| Subscription     | Stack     | Pro plan purchase/restore                               |
| Groups           | Stack     | Miner grouping with drag-to-reorder                     |
| Wallets          | Stack     | Wallet management                                       |
| ImportData       | Stack     | CSV/JSON data import                                    |

## Subscription Tiers

- **Free**: Up to 4 miners, basic features
- **Pro**: Unlimited miners, Dark Pool, Theme Marketplace, Auto-pool-switching, Firmware OTA

## Build & Deploy

- **Web**: `npm run build:web` → Expo export → Vercel
- **Native**: `npx expo prebuild` → Xcode / Gradle
- **Desktop**: Electron packaged from web build
- **Backend**: Railway (Node.js + PostgreSQL)
- **CI**: GitHub Actions (lint, test, build, E2E, Lighthouse, deploy)

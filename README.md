# HashWatch

Real-time Bitcoin miner monitoring for Bitaxe. Monitor hashrate, temperature, power draw, and pool performance across multiple ASIC miners from a single dashboard — on iOS, Android, web, and desktop.

## Features

- **Real-time WebSocket** — Live miner updates over WebSocket with automatic reconnection and 30s/5min polling fallback
- **Offline-first PWA** — SQLite (native) / localStorage (web) local store, queued settings sync, service worker with stale-while-revalidate caching and offline fallback page
- **Batch Firmware OTA** — Flash firmware to multiple miners at once with per-miner progress tracking and version checking
- **7 Languages** — English, Spanish, French, German, Japanese, Chinese, and Norwegian (Bokmål)
- **14 Themes** — dark, light, neon, matrix, 5tratum, crimson, ocean, lavender, midnight, nord, dracula, catppuccin, rosepine, and system mode, plus custom theme editor
- **Kiosk Mode** — Locked-down dashboard display for wall-mounted monitoring
- **Dark Pool** — Anonymous hashrate contribution with aggregate network stats and pool/region breakdown
- **Push Notifications** — Expo push (native) and VAPID web push with webhook delivery
- **Multi-platform** — iOS, Android, Web (PWA), and Desktop (Electron)

### More

- **Live Dashboard** — Real-time hashrate, temperature, power, and efficiency metrics with skeleton loading
- **Analytics** — Historical charts (hashrate, temperature, power, voltage, fan, uptime) with 1h/24h/7d/30d range selectors
- **Smart Alerts** — Configurable thresholds for temperature, hashrate drop, share rejection, and offline reminders per miner
- **Health Scores** — Uptime tracking, efficiency trends, grade badges, and pool earnings comparison
- **Fleet Health** — Aggregate fleet scoring, grade distribution, earnings estimates with live BTC price, and smart recommendations
- **Groups** — Organize miners into groups with auto-assign rules (regex/substring matching) and drag-to-reorder
- **Miner Comparison** — Side-by-side stats table for 2+ miners with best/worst highlighting
- **Batch Operations** — Multi-select miners for group assignment, wallet assignment, or bulk deletion
- **Wallets** — Track mining revenue across wallets with custom color labels
- **Import/Export** — JSON import and CSV export (per-miner or date-ranged) with progress tracking
- **Pool Recommendations** — Pool analytics with break-even analysis and fee deduction
- **Pool Providers** — ViaBTC, F2Pool, Poolin API integrations alongside Braiins and Luxor
- **Automated Actions** — Auto-restart offline miners, auto-pool-switch by profitability threshold, action logging
- **Team Webhooks** — Slack/Discord webhook notifications with Block Kit and embed formatting
- **Multi-Channel Notifications** — Push, Email, SMS, Telegram, Slack, Discord delivery channels
- **Onboarding Wizard** — Guided first-run setup
- **Undo Toast** — Undoable confirmation for destructive actions (delete miner, remove group, delete wallet)
- **Desktop** — Electron wrapper with single-instance lock, window state persistence, and keyboard shortcuts

## Tech Stack

| Layer      | Technology                                      |
| ---------- | ----------------------------------------------- |
| Framework  | Expo SDK 56, React 19, React Native 0.85        |
| Language   | TypeScript 6.0                                  |
| State      | Zustand 5                                       |
| Navigation | React Navigation 7 (bottom tabs + native stack) |
| Backend    | Express 4, Node 22, PostgreSQL 16               |
| Auth       | JWT (jsonwebtoken), bcryptjs                    |
| Validation | Zod                                             |
| Testing    | Jest 29/30, Testing Library, Playwright         |
| Linting    | ESLint 10, Prettier                             |
| Desktop    | Electron 33                                     |
| CI/CD      | GitHub Actions                                  |
| Purchases  | RevenueCat + Stripe                             |
| Analytics  | PostHog                                         |

## Screenshots

<!-- Add screenshots here -->

## Supported Platforms

- **iOS** — Expo native build, App Store ready (store metadata in `store-metadata/`)
- **Android** — Expo native build, Play Store ready
- **Web** — PWA with install prompt, offline support, and background sync
- **Desktop** — Electron (macOS `.dmg`, Windows `.nsis`, Linux `.AppImage`)

## Getting Started

```bash
# Install dependencies
npm install

# Start the frontend dev server
npx expo start

# In a new terminal, start the backend
cd backend
npm install
npm run db:init
npm run dev
```

### Backend Setup

Configure the backend in `backend/.env` (copy from `backend/.env.example`):

```
DATABASE_URL=postgresql://user:password@localhost:5432/hashwatch
JWT_SECRET=your-secret-key
PORT=4000
```

`PORT` defaults to `4000`. The frontend reads the API base URL from app config (see `src/constants/` for proxy/extra configuration).

### Building

```bash
npm run build:web    # Production web build (Expo export → dist/)
npm run electron:build  # Desktop builds
```

### Testing

```bash
npx jest                 # Frontend unit tests
npm run test:e2e         # Playwright end-to-end tests
npm run typecheck        # TypeScript type checking
npm run lint             # ESLint
```

## Conventions

- **Commits** — [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `test:`, `chore:`, `docs:`, `refactor:`
- **Design tokens** — Use the token system in `src/utils/design.ts` (spacing, radius, fontSize, fontWeight, cardShadow, cardStyle) instead of hardcoded values
- **i18n** — All UI strings go through `useTranslation()` with keys added to all 7 locale files (`src/i18n/*.json`). Accessibility labels stay as readable English.
- **Testing** — `@testing-library/react-native` v14 APIs, `jest.mock` before imports, `.unref()` on all timers

## License

MIT

## Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) — Project structure, data flow, patterns
- [API.md](API.md) — Backend REST API reference
- [CONTRIBUTING.md](CONTRIBUTING.md) — Contribution guide
- [CHANGELOG.md](CHANGELOG.md) — Release history

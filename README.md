# HashWatch

Real-time BitAxe miner monitoring app built with Expo and React Native. Track hashrate, temperature, power draw, and pool performance across multiple miners from a single dashboard.

## Features

- **Live Dashboard** -- Real-time hashrate, temperature, power, and efficiency metrics with skeleton loading
- **Analytics** -- Historical charts (hashrate, temperature, power, voltage, fan, uptime) with 1h/24h/7d/30d range selectors
- **Smart Alerts** -- Configurable thresholds for temperature, hashrate drop, share rejection, and offline reminders per miner
- **Push Notifications** -- Expo push (native) and VAPID web push with webhook delivery
- **Themes** -- 14 built-in themes (dark, light, neon, matrix, 5tratum, crimson, ocean, lavender, midnight, nord, dracula, catppuccin, rosepine) plus custom theme editor with hex input
- **Dark Pool** -- Anonymous hashrate contribution, aggregate network stats, pool/region breakdown
- **Firmware OTA** -- Batch firmware flashing with per-miner progress tracking and version checking
- **Health Scores** -- Uptime tracking, efficiency trends, and pool earnings comparison
- **Pool Recommendations** -- Pool analytics with break-even analysis and fee deduction
- **Groups** -- Organize miners into groups with auto-assign rules (regex/substring matching)
- **Miner Comparison** -- Side-by-side stats table for 2+ miners with best/worst highlighting
- **Batch Operations** -- Multi-select miners for group assignment, wallet assignment, or bulk deletion
- **Wallets** -- Track mining revenue across wallets with custom color labels
- **Import/Export** -- JSON data import with progress tracking
- **Undo Toast** -- Undoable confirmation for destructive actions (delete miner, remove group, delete wallet)
- **i18n** -- Full localization in English, Spanish, French, German, Japanese, and Chinese
- **Desktop** -- Electron wrapper with single-instance lock, window state persistence, and keyboard shortcuts
- **Offline Queue** -- Settings sync queued and retried on network reconnect

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
| Purchases  | RevenueCat                                      |

## Quick Start

```bash
# Clone
git clone https://github.com/aktheman/hashwatch.git
cd hashwatch

# Install dependencies
npm install

# Start the backend
cd backend
npm install
npm run db:init
npm run dev

# In a new terminal, start the frontend
cd ..
npm start
```

### Environment

The backend requires a PostgreSQL database. Configure the connection in `backend/.env`:

```
DATABASE_URL=postgresql://user:password@localhost:5432/hashwatch
JWT_SECRET=your-secret-key
PORT=4000
```

## Available Scripts

| Script                   | Description                    |
| ------------------------ | ------------------------------ |
| `npm start`              | Start Expo dev server          |
| `npm run android`        | Run on Android device/emulator |
| `npm run ios`            | Run on iOS device/simulator    |
| `npm run web`            | Start web dev server           |
| `npm run build:web`      | Production web build           |
| `npm run electron`       | Run Electron desktop app       |
| `npm run electron:build` | Build Electron distributable   |
| `npm test`               | Run frontend tests             |
| `npm run test:e2e`       | Run Playwright E2E tests       |
| `npm run typecheck`      | TypeScript type checking       |
| `npm run lint`           | ESLint check                   |
| `npm run lint:fix`       | ESLint auto-fix                |
| `npm run format`         | Prettier check                 |
| `npm run format:fix`     | Prettier auto-fix              |

### Backend Scripts

Run from the `backend/` directory:

| Script            | Description                   |
| ----------------- | ----------------------------- |
| `npm run dev`     | Start backend with hot reload |
| `npm run build`   | Compile TypeScript            |
| `npm start`       | Start production server       |
| `npm run db:init` | Initialize database schema    |
| `npm test`        | Run backend tests             |

## Screenshots

<!-- Add screenshots here -->

## License

MIT

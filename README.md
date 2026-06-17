# HashWatch

Real-time Bitaxe miner monitoring app. Track hashrate, temperature, pool stats, power cost, and more across all your miners from one dashboard.

## Features

- **Live Dashboard** — Monitor all miners at a glance with hashrate, temperature, power, and efficiency
- **Network Discovery** — Scan your local network to find miners automatically, or add by IP
- **Per-Miner Detail** — Deep stats: hash charts, efficiency trends, pool info, firmware version, restart control
- **Pools Overview** — Group miners by mining pool with aggregated hashrate and estimated daily earnings
- **Analytics** — Historical hashrate charts over 1h/24h/7d ranges
- **Wallets** — Organize miners into wallet groups for portfolio tracking
- **Push Alerts** — Get notified on offline, high temp, hashrate drops, pool disconnects, and long uptime
- **Power Cost** — Enter your $/kWh rate to see power cost and net profit estimates
- **Multiple Themes** — Dark, Light, Neon, and Matrix themes
- **Data Export** — Export all miner snapshots to CSV
- **Remote Sync** — Sign in to sync miners across devices via the backend
- **Android Widget** — Home screen widget showing total hashrate and online count
- **Auto-Scan** — Periodically scan the network for new miners
- **Group Tags** — Tag and filter miners by group
- **Cross-Platform** — iOS, Android, and Web

## Tech Stack

- **Frontend:** React Native / Expo SDK 56, TypeScript, Zustand
- **Navigation:** React Navigation (native stack + bottom tabs)
- **Backend:** Node.js, Express, PostgreSQL, WebSockets
- **Charts:** react-native-chart-kit
- **Subscriptions:** RevenueCat
- **Database:** expo-sqlite (mobile), localStorage (web)
- **CI:** GitHub Actions, Husky, lint-staged
- **Build:** EAS Build

## Getting Started

### Prerequisites

- Node.js 22+
- npm or yarn

### Frontend

```bash
git clone https://github.com/your-org/hashwatch.git
cd hashwatch
cp .env.example .env
npm install
npx expo start
```

### Environment Variables

| Variable                             | Description                                        |
| ------------------------------------ | -------------------------------------------------- |
| `EXPO_PUBLIC_API_URL`                | Backend API URL (default: `http://localhost:4000`) |
| `EXPO_PUBLIC_MINER_PROXY_URL`        | Proxy URL for web builds                           |
| `EXPO_PUBLIC_REVENUECAT_IOS_KEY`     | RevenueCat iOS SDK key                             |
| `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` | RevenueCat Android SDK key                         |

### Web Proxy

On web, browsers cannot directly connect to miners on your local network. Run the proxy:

```bash
cp .env.example .env
node local-proxy.js
```

Then set the proxy URL in Settings → Connection.

## Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

See [backend/README.md](backend/README.md) for full setup (PostgreSQL, auth, WebSocket sync).

## Building

```bash
# Android APK
eas build --platform android --profile preview

# iOS
eas build --platform ios --profile preview

# Web
npm run build:web
npm run deploy:web
```

## Testing

```bash
# Unit tests (471 frontend + 37 backend passing)
npm test

# Backend
cd backend && npm test

# E2E (Maestro — requires iOS simulator or Maestro Cloud)
maestro test .maestro/onboarding.yaml
```

## License

MIT

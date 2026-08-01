# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Real-time WebSocket for live miner updates with auto-reconnect and polling fallback
- Batch firmware OTA flashing with per-miner progress tracking
- Alert search and filtering
- Norwegian (Bokmål) locale — now 7 languages total
- Kiosk mode for locked-down dashboard display
- Onboarding wizard with guided first-run setup
- Groups sync to backend (`POST /api/groups/sync`)
- VAPID web push subscription endpoints (`POST /api/push/web-subscribe`, `POST /api/push/web-unsubscribe`)
- DASH/ASIC boost support
- iOS widget
- Unlimited miners on the free tier (`FREE_MAX_MINERS=999`)
- Bundle optimization and docker-compose / E2E CI improvements

## [1.0.1] - 2026-07-31

### Added

- Fleet Health dashboard — aggregate scoring, grade distribution, per-miner cards, earnings estimates with live CoinGecko BTC price, health timeline bars, and smart recommendations
- Automated Actions — auto-restart offline miners (configurable delay) and auto-pool-switch (profitability threshold) with action logging
- Pool Providers screen — connect/disconnect ViaBTC, F2Pool, Poolin alongside Braiins and Luxor
- Multi-channel notifications — Push, Email, SMS (Twilio), Telegram, Slack, Discord delivery
- Team webhooks — Slack Block Kit + Discord embeds, CRUD, and test delivery
- 4 new screens — Predictive Maintenance, Activity Feed, World Map, Dashboard Builder
- WebSidebar — collapsible sidebar navigation for desktop web
- User Profile screen — account management, password change, stats
- API documentation page — Swagger UI with full OpenAPI spec
- BitAxe hardware comparison page — specs table, model cards, buying guide
- Mining profitability calculator with presets and break-even analysis
- Blog section with SEO-optimized articles
- Landing page, Stripe web checkout, PostHog analytics, free trial, web subscription sync, OG image, testimonials, newsletter, and legal pages
- Rate limiting middleware — login 5/min, register 3/min, dark pool 1/5min, general API 60/min
- `POST /api/errors` — client error/event batch reporting endpoint
- Public dashboard sharing, miner marketplace, team/org plans with roles, SMS/Telegram alert channels, Discord/Telegram bot mirroring, anomaly detection, solar/renewable energy tracking, and multi-pool profitability switching
- Notification batching (2s window), per-miner and date-range CSV export
- PWA install prompt, offline page, service worker v3 with stale-while-revalidate caching
- Theme marketplace and custom themes system (max 20 per user)
- Health score UI, pool recommendations, and auto-pool-switching
- Design token audit and shared `getChartConfig()` for all chart components

### Changed

- i18n completed across all screens — no hardcoded UI strings remain (7 locales)
- WebSocket polling replacement — polling interval extends to 5min when WS active (30s fallback)
- RevenueCat init on app restore, native snapshot downsampling (7–30d → hourly buckets)
- `React.memo` wrapping on all chart/display components, lazy-loaded charts
- Web bundle reduced to ~2.4MB via 3-pass minifier and platform stubs
- Vercel routing — renamed SPA entry to `app.html` with `:path*` rewrites for `/app`
- Backend structured logging (`log.error`) across all route files and services

### Fixed

- Launch Dashboard 404 — `app.html` missing from `dist`, fixed build script + serve.js fallback + 404.html
- Vercel routing collisions between landing page and Expo SPA
- Notification push token ownership — register returns `409` if token belongs to another user
- Security hardening — SSRF protection on proxy, blocked headers, CORS origins, CSP via Helmet, XSS and rate-limit protections
- Flaky tests — `afterEach(() => jest.restoreAllMocks())` to prevent mock leaking between Jest workers
- `.unref()` compliance for all timers (toast, websocket, poller, public dashboard rate buckets)
- Re-entrancy guard in miner refresh to prevent concurrent `refreshAll` calls

### Security

- Secure JWT token generation, API key masking, generic error messages (no internal leak)
- Axios response size limits (1MB) and flash endpoint method allowlist (POST/PUT only)
- Proxy URL allowlist restricting requests to private miner URLs

## [1.0.0] - 2026-07-10

### Added

- Live dashboard with miner cards, filtering, and skeleton loading
- Miner management — add/remove/update miners, network scan, IP editing
- Analytics — historical charts with 1h/24h/7d/30d range selectors
- Smart alerts with configurable thresholds per miner (temperature, hashrate drop, offline reminders)
- Push notifications via Expo and alert history with read tracking
- 10 built-in themes plus custom theme editor and sunrise/sunset auto-theme
- i18n in 6 locales (English, Spanish, French, German, Japanese, Chinese)
- Dark Pool — anonymous hashrate contribution with aggregate stats and cooldown rate limiting
- Firmware OTA screen — batch flash with per-miner progress and version checking
- Groups with auto-assign rules (regex/substring matching) and drag-to-reorder
- Wallets with custom color labels, import/export, and undo toasts
- Auth — register/login with JWT (30-day expiry) and bcrypt password hashing
- Backend — Express API with PostgreSQL, miners, stats, settings, proxy, notes, webhooks, and cache middleware
- Offline-first storage — SQLite (native) / localStorage (web) with queued settings sync
- Docker — multi-stage backend Dockerfile and docker-compose (Postgres 16 + backend)
- Electron desktop shell, GitHub Actions CI, and OpenAPI spec

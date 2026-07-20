# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

## Constraints & Preferences

- Follow conventional commits style (feat:, fix:, test:, chore:)
- All changes must pass TypeScript (`npx tsc --noEmit`) and ESLint (`npx eslint src/ --max-warnings=0`)
- All tests must pass: frontend (`npx jest --no-coverage`) and backend (`cd backend && npx jest --no-coverage`)
- Must use `@testing-library/react-native` v14 APIs (async render/renderHook, no UNSAFE_getAllByType)
- Tests with accessibility-hidden elements must use `{ includeHiddenElements: true }` query option
- Timers in modules must call `.unref()` to prevent Jest worker leaks
- Do NOT run `npm audit fix --force` — it downgrades expo and breaks everything
- `babel.config.js` exists (for Jest dynamic import support); Metro ignores it since expo/metro-config handles babel separately
- `babel-plugin-dynamic-import-node` dev dep transforms `import()` → `require()` in Jest env

## Key Files

- `__tests__/miners-store.test.ts`: 50 tests covering load/add/remove/refresh/sync/snapshots/wallet/group + auto-assign rules (12 tests: load/save, regex match, name match, disabled, unknown miner, invalid regex fallback, applyAll, first-match-wins, no-rules)
- `__tests__/miners-store-edge.test.ts`: 7 tests — AppState pause/resume, interval tick (paused/not-paused), onAuthLogin callback, scanNetwork error/success, offline retry
- `__tests__/widget.test.tsx`: 3 tests (Android guard, native module call, missing module)
- `__tests__/authToken.test.ts`: 6 tests (getter, setter, login callbacks)
- `__tests__/networkStatus.test.ts`: 11 tests (online, offline, null fallback, catch, multi-listener, cleanup, onNetworkReconnect staying-online, staying-offline, override) + 1 untestable branch comment
- `__tests__/version.test.ts`: 13 tests (parse, needsUpdate, fetch success/failure, changelog URL, fetchNetworkHashrate)
- `__tests__/theme.test.ts`: 42 tests (all 14 themes, setThemeMode, mode tracking, custom themes, useTheme hook, system mode web/non-web/matchMedia)
- `__tests__/api-client.test.ts`: 28 tests (auth, interceptors, caching, error handling)
- `__tests__/DashboardScreen.test.tsx`: 38 tests (filtering, upgrade banner, error banner, scanning, wallet/group filters, temp display, comparison selection mode, batch operations)
- `__tests__/WalletsScreen.test.tsx`: 14 tests (CRUD, modal, color picker, validation)
- `__tests__/MinerDetailScreen.test.tsx`: 19 tests (rendering, share, delete, offline, not-found, goBack, wallet picker, group tag input, efficiency trend, restart miner)
- `__tests__/SettingsScreen.test.tsx`: 26 tests (theme, remote sync, auth, power cost, exports, Sync Now button, syncing disabled)
- `__tests__/auth-store.test.ts`: 38 tests (login, register, logout, restoreSession, syncSettingsFromBackend, syncNow, loadQueue, JWT decode, module-level setup, onNetworkReconnect callback)
- `__tests__/AddMinerScreen.test.tsx`: 14 tests (pro limit, add error, scan cancel, scan fail, discovered list, add discovered, scan progress)
- `__tests__/AnalyticsScreen.test.tsx`: 11 tests (summary stats, range selectors including 30d, chart, Power Cost, static labels, empty state)
- `__tests__/ImportDataScreen.test.tsx`: 8 tests (empty input, importing state, button disabled, success, singular, failure, non-Error throw)
- `__tests__/bitcoin.test.ts`: 13 tests (mainnet P2PKH/P2SH/Bech32, testnet Bech32/legacy, invalid checksums, mixed case, invalid charset)
- `__tests__/OnboardingScreen.test.tsx`: 8 tests (swipe slides, get-started on last slide)
- `__tests__/toast.test.ts`: 9 tests (showUndo, dismissUndo, auto-confirm timer, timer cancel on new action, timer cancel on dismiss, safe dismissUndo when null, same-id timer clear)
- `__tests__/UndoToast.test.tsx`: 4 tests (null state, renders message+undo, tap calls onUndo, accessibility label)
- `__tests__/GroupsScreen.test.tsx`: 27 tests (header, counts, all groups, empty, create, edit, duplicate, remove, rename fallback, miner groups, move up/down, drag-to-reorder, rename via prompt, cancel rename)
- `__tests__/AppNavigator.test.tsx`: 14 tests (main app, all tabs, miner card, OfflineBanner, lazy fallback, navigation, notification tap)
- `__tests__/constants.test.ts`: 10 tests (getExtra, getProxyUrl, setProxyUrl success/DB failure, initProxyUrl saved/null/error)
- `__tests__/bitaxe.test.ts`: 18 tests (system info, miner status, fetchAll, restart, probe with fallback paths, non-primary paths, wifi fields)
- `__tests__/bitaxe-web.test.ts`: 13 tests (web proxy for info/status/fetchAll/restart/probe, auth header injection, error handling)
- `__tests__/Skeleton.test.tsx`: 4 tests (Skeleton default/custom, SkeletonCard default/custom rows)
- `__tests__/biometric.test.ts`: 7 tests (biometric availability, authentication, web guard)
- `__tests__/contrast.test.ts`: 9 tests (hex parsing, luminance, contrast ratio, theme audit)
- `__tests__/haptics.test.ts`: 14 tests (all haptic types, web platform guard)
- `__tests__/snapshots.test.tsx`: 4 tests (screen snapshots)
- `__tests__/ScreenErrorBoundary.test.tsx`: 4 tests (render children, error UI, retry, goBack)
- `__tests__/SummaryCard.test.tsx`: 4 tests (icon/value/label, custom color, accent bar)
- `__tests__/design.test.ts`: 23 tests (tokens, cardShadow, cardStyle, layout constants, inputStyle)
- `.github/workflows/ci.yml`: CI pipeline with backend, frontend, web-build, iOS build, Android build, deploy, e2e, coverage threshold verification, `workflow_dispatch` trigger
- `backend/openapi.json`: OpenAPI 3.0 spec with 37 paths, 42 schemas
- `backend/src/__tests__/webhook.test.ts`: 7 tests (sendWebhook success/failure, no URL, empty URL, invalid URL, deleteLogs)
- `backend/src/__tests__/cache.test.ts`: 8 tests (pass-through non-GET, cache hit/miss, TTL, auth differentiation, different URLs, invalidateAll, invalidatePrefix)
- `backend/src/__tests__/webhooks.test.ts`: 3 tests (GET logs, empty logs, DELETE logs)

## Latest Round (Session 2026-07-17 — Rounds 28-31)

### Changes (Rounds 28-31 — 11 product features)

- **Public Dashboard Sharing**: Shareable read-only URL per miner, auto-refresh 30s, branded header
- **Miner Marketplace**: Buy/sell used Bitaxes, listing CRUD, detail modal, Pro-gated
- **Team/Org Plan**: Create team, invite members by email, role-based access (owner/admin/viewer), multi-location monitoring
- **Alert SMS/Telegram Integration**: Register SMS/Telegram channels, test notifications, auto-forward from push alerts
- **Historical Data PDF Export**: HTML reports with SVG charts, date range picker, Pro-gated
- **Discord/Telegram Bot Mirroring**: Webhook-based alert forwarding, SSRF protection, test message
- **Mining Profitability Comparison**: Pool A vs B side-by-side scoring, earnings estimates, winner badges
- **Contributor Leaderboard**: GitHub API integration, avatars, rank badges, repo stats
- **AI Anomaly Detection**: Hashrate decline, temp spikes, voltage issues, failure probability, health trends
- **Solar/Renewable Energy Tracking**: Energy sources, readings, carbon savings, cost estimates
- **Multi-Pool Profitability Switching**: Composite scoring (fee/luck/payout), threshold, auto-switch toggle

### Test results

- Frontend: 1578 tests passing (117 suites) — ESLint clean
- Backend: 247 tests passing (27 suites)
- Total: 1825 tests

## Previous Round (Session 2026-07-17 — Round 27)

### Changes (Round 27 — Rate limiting, error tracking endpoint, chart optimization, visual E2E)

- **Rate limiting**: Sliding window middleware — login 5/min, register 3/min, dark pool 1/5min, general API 60/min, error endpoint 10/min
- **POST /api/errors**: Backend endpoint for client error/event batches with auth, validation, in-memory store (max 1000)
- **Backend tests**: errors endpoint (5 tests), dark pool tests preserved
- **Shared chartConfig**: `getChartConfig()`, `CHART_WIDTH`, `CHART_HEIGHT` — all 5 chart components refactored to use shared config
- **FeatureGate test**: 5 tests (pro/free rendering, overlay, feature name, upgrade text)
- **errorTracking test**: 8 tests (disabled/enabled queueing, flush, MAX_QUEUE_SIZE, console fallback)
- **Visual regression E2E**: dashboard/settings/darkmode screenshot tests
- **Tests**: 1578 frontend + 247 backend = 1825 total, all passing.

### Test results

- Frontend: 1578 tests passing (117 suites) — ESLint clean
- Backend: 247 tests passing (27 suites)
- Total: 1825 tests

## Previous Round (Session 2026-07-17 — Round 26)

### Changes (Round 26 — Subscription gating, error tracking, performance, accessibility, E2E, Lighthouse)

- **FeatureGate component**: Wraps Pro features — Dark Pool, Firmware, Auto-pool-switch, Theme Marketplace locked behind subscription
- **Error tracking**: `errorTracking.ts` batch queues errors/events with API flush, unhandled error capture on web, auto-capture for window errors/rejections
- **Performance**: 6 chart components in MinerDetailScreen lazy-loaded (HashrateChart, TemperatureChart, EfficiencyTrend, PowerChart, VoltageChart, FanChart)
- **i18n**: subscriptionGate feature names (firmware, darkPool, autoPoolSwitch, marketplace) in all 6 locales
- **Accessibility**: DashboardScreen, WalletsScreen, GroupsScreen, SubscriptionScreen — headers + labels added
- **E2E tests**: expanded from 4 to 19 Playwright tests (all tabs, settings, groups, wallets, onboarding, subscription)
- **Lighthouse CI**: `lighthouserc.json` + ci.yml job (performance >= 0.8, accessibility >= 0.9, best-practices >= 0.8, seo >= 0.8)
- **ARCHITECTURE.md**: project structure, data flow, key patterns, screen table, subscription tiers, build/deploy
- **Tests**: 1565 frontend + 242 backend = 1807 total, all passing.

### Test results

- Frontend: 1565 tests passing (115 suites) — ESLint clean
- Backend: 242 tests passing (26 suites)
- Total: 1807 tests

## Previous Round (Session 2026-07-17 — Round 25)

### Changes (Round 25 — WebSocket polling replacement, RevenueCat init, native downsampling, PWA background sync)

- **WebSocket polling replacement**: WS auto-connect on login; polling interval extends to 5min when WS active (30s fallback). `onWebSocketMessage` callback for WS message forwarding to store.
- **RevenueCat initialization**: `useSubscriptionStore.initialize()` called on app restore in `App.tsx`. `SubscriptionScreen` already wired in navigator with full purchase/restore UI.
- **Native data downsampling**: `downsampleSnapshots()` in `database.native.ts` aggregates 7–30 day snapshots into hourly buckets (avg hashRate, temp, power, etc.). `cleanupOldSnapshots()` restored to pure delete.
- **PWA background sync**: Service worker `sync` event handler sends `SW_RECONNECT` message to all clients when reconnect tag fires. `websocket.ts` listens for `SW_RECONNECT` and auto-reconnects.
- **Tests**: 1565 frontend + 242 backend = 1807 total, all passing.

### Test results

- Frontend: 1565 tests passing (115 suites) — ESLint clean
- Backend: 242 tests passing (26 suites)
- Total: 1807 tests

## Previous Round (Session 2026-07-17 — Round 24)

### Changes (Round 24 — Notification batching, export, PWA install, theme marketplace)

- **Notification batching**: Alerts within 2s window grouped into single summary notification ("3 miners went offline")
- **Per-miner export**: MinerDetailScreen "Export CSV" button, `exportMinerCSV()` for individual miner snapshots
- **Date-range export**: `exportSnapshotsWithRange(startMs, endMs)` for filtered CSV export
- **PWA install prompt**: `PWAInstallBanner` detects `beforeinstallprompt`, shows bottom banner, dismissible per session
- **Theme marketplace**: `ThemeMarketplaceScreen` — browse community themes, import from URL/clipboard/file, share themes
- **Settings navigation**: Marketplace link in custom themes section header
- **Backend CSP**: Explicit Helmet directives (script/style/font/img/connect/worker/manifest/frame/object/base/form)
- **PWA manifest**: `public/manifest.json` with multi-size icons (1024/48), shortcuts, categories
- **Offline page**: `public/offline.html` branded fallback
- **Service worker v3**: Stale-while-revalidate API caching, offline navigation fallback, versioned caches
- **Data retention UI**: SettingsScreen 1-90 day picker, `cleanupOldSnapshots` reads from settings
- **i18n**: marketplace (24 keys) + pwa (3 keys) × 6 locales
- **Tests**: 1565 frontend + 242 backend = 1807 total, all passing.

### Test results

- Frontend: 1565 tests passing (115 suites) — ESLint clean
- Backend: 242 tests passing (26 suites)
- Total: 1807 tests

## Previous Round (Session 2026-07-16 — Round 22)

### Changes (Round 22 — Health score UI, pool recs, auto-switch, Sentry, docs)

- **Health Score UI**: MinerDetailScreen health score section (grade badge + factor breakdown bars). MinerCard small health grade badge.
- **Pool Recommendations**: DashboardScreen collapsible section with pool recommendations. Auto-hides when empty.
- **Auto-pool-switching**: SettingsScreen opt-in toggle. `autoPoolSwitch.ts` service.
- **Sentry + Analytics**: `errorTracking.ts` (no-op until DSN), `analytics.ts` (8 tracking functions), ErrorBoundary captureError.
- **Documentation**: README.md, CONTRIBUTING.md, API.md (18 endpoint groups).
- **Tests**: 1560 frontend + 242 backend = 1802 total, all passing.

### Test results

- Frontend: 1560 tests passing (115 suites) — ESLint clean
- Backend: 242 tests passing (26 suites)
- Total: 1802 tests

## Previous Round (Session 2026-07-16 — Round 20)

### Changes (Round 20 — Firmware OTA, dark pool, smart alerts, profitability dashboard)

- **Firmware OTA screen**: `FirmwareScreen.tsx` — batch flash, per-miner progress, version checking, skip version
- **Dark pool backend**: 4 routes (contribute, aggregate, my-contributions, delete) with auth, rate limiting (5min cooldown), input validation
- **Dark pool frontend**: `DarkPoolScreen.tsx` — opt-in toggle, contribute button, network stats (total hashrate, contributors, efficiency), pool distribution bars, contribution history, delete data, period selector (1h/24h/7d/30d)
- **Smart alerts**: Share rejection slider (1-50%, per-miner), "Reset to Defaults" button, global default alert rules (`getDefaultAlertRules`/`setDefaultAlertRules`)
- **ProfitabilityCard**: Pool earnings comparison, break-even analysis, pool fee deduction
- **Navigation**: Registered `FirmwareScreen` + `DarkPoolScreen` in AppNavigator + RootStackParamList
- **Dark pool API**: 4 client functions (`contributeDarkPool`, `getDarkPoolAggregate`, `getDarkPoolMyContributions`, `deleteDarkPoolMyContributions`)
- **i18n**: 25+ new keys across all 6 locales (darkPool, firmware, shareRejection, resetDefaults)
- **TypeScript**: clean, **ESLint**: clean
- **Tests**: 1472 frontend + 227 backend = 1699 passing (5 pre-existing ProfitabilityCard SQLite failures)

### Test results

- Frontend: 1472 tests passing (109 suites) — ESLint clean
- Backend: 227 tests passing (25 suites)
- Total: 1699 tests

## Previous Round (Session 2026-07-15 — Round 17)

### Changes (Round 17 — Theme picker redesign, preview modal, custom themes)

- **Theme picker redesign**: 2-column grid with color swatches (bg/primary/accent per theme)
- **Theme preview modal**: Full preview with color swatches, text samples, action buttons
- **Custom themes backend**: `custom_themes` table + CRUD API (max 20/user)
- **Custom theme editor**: Tabbed color editor (5 groups), hex input, clone from built-in themes
- **ThemePicker component**: Reusable component with grid + preview modal
- **Custom theme store**: Zustand store with API sync
- **i18n**: Theme editor strings in all 6 locales
- **Tests**: +24 new (ThemePicker: 4, ThemePreviewModal: 5, theme-extensions: 7, customThemes: 8)
- **Snapshot**: Updated for SettingsScreen

### Test results

- Frontend: 1457 tests passing (107 suites) — ESLint clean
- Backend: 227 tests passing (25 suites)
- Total: 1684 tests

## Previous Round (Session 2026-07-15 — Round 16)

### Changes (Round 16 — Flaky test fix, 4 new themes)

- **Flaky test fix**: `alertHistory.test.ts` — added `afterEach(() => jest.restoreAllMocks())` to prevent mock leaking between Jest workers
- **4 new themes**: `nordTheme`, `draculaTheme`, `catppuccinTheme`, `rosepineTheme` — all 23 color properties each
- **Theme mode union**: updated to include `'nord' | 'dracula' | 'catppuccin' | 'rosepine'`
- **SettingsScreen**: 14 theme buttons (added ❄️🧛🐱🌲)
- **i18n**: 4 new theme name keys in all 6 locales (en/es/fr/de/ja/zh)
- **Theme tests**: 42 total (was 22), +8 new tests for setTheme/setThemeMode/applyMode
- **Snapshot**: updated for SettingsScreen theme picker

### Test results

- Frontend: 1441 tests passing (104 suites) — ESLint clean
- Backend: 219 tests passing (24 suites) — no flaky tests
- Total: 1660 tests

## Previous Round (Session 2026-07-15 — Round 15)

### Changes (Round 15 — Backend security, structured logging, re-entrancy guard, OpenAPI)

- **Push token ownership**: `POST /api/push/register` returns 409 if token belongs to another user
- **Proxy security**: axios response size limits (1MB), flash endpoint method allowlist (POST/PUT only)
- **Webhook logs pagination**: returns `{ logs, total, limit, offset }` with `limit`/`offset` query params
- **Structured logging**: all `console.error` → `log.error(...)` in 8 route files + services + init
- **Re-entrancy guard**: `miners.ts` `let refreshing = false` prevents concurrent `refreshAll`
- **ESLint**: removed 7 unused callbacks in `DashboardCustomizer.tsx`
- **OpenAPI**: added 5 endpoint groups + 5 schemas to `openapi.json`
- **Test fixes**: `push.test.ts` ownership mock, `webhooks.test.ts` paginated response format

### Test results

- Frontend: 1433 tests passing (104 suites) — ESLint clean
- Backend: 218 tests passing (24 suites)
- Total: 1651 tests

## Previous Round (Session 2026-07-14 — Round 14)

### Changes (Round 14 — Bug fixes, security hardening, performance, i18n, CI)

- **Crash bugs fixed**: `notifications.ts` JSON.parse try/catch, `MinerDetailScreen` restart try/catch
- **`.unref()` compliance**: toast.ts, websocket.ts, FirmwareUpdateBanner.tsx, backend/ws.ts, backend/services/poolAnalytics.ts — all 6 missing calls added
- **i18n**: 11 new keys in SettingsScreen/MinerDetailScreen/ImportDataScreen across all 6 locales
- **Backend hardening**: input validation (8 routes), try/catch error handling, API key masking, generic error messages
- **React.memo**: 13 components wrapped (EarningsCard, FirmwareBanner, MinerDrillDownModal, MinerSnapshotCard, NotificationPrefs, PoolCoverage, EfficiencyTrend, FanChart, HashrateChart, PowerChart, TemperatureChart, VoltageChart, OfflineBanner)
- **Accessibility**: 12 components added `accessibilityRole` + `accessibilityLabel`
- **CI**: npm caching, removed redundant web-lockfile job, Vercel token as env var, `!failure()` deploy condition
- **Magic numbers → constants**: 6 service files (firmwareUpdate, notifications, networkStatus, autoTheme, websocket, dynamicIsland)

### Test results

- Frontend: 1433 tests passing (104 suites) — TypeScript clean, ESLint clean
- Backend: 218 tests passing (24 suites)
- Total: 1651 tests

## Previous Round (Session 2026-07-10 — Round 11)

### Changes (Round 11 — GroupsScreen i18n completion)

- **GroupsScreen i18n**: Completed i18n for all remaining hardcoded strings in GroupsScreen.
  - `°C avg` display text replaced with `t('groups.avgTemp', { temp })` — translated in all 6 locales (en: "°C avg", es: "°C prom", fr: "°C moy", de: "°C Durschn", ja: "°C 平均", zh: "°C 平均")
  - Auto-assign rules section: all UI strings already using `t()` keys (added in Round 10), now confirmed with full key sets in all locale files
  - Accessibility labels kept as readable English strings (not i18n keys) — screen readers need human-readable text, and the `t()` mock in tests returns keys (not interpolated values), causing duplicate label issues
  - All 6 locale files (en/es/fr/de/ja/zh) now have complete auto-assign rules section (18 keys each)

### Test results

- Frontend: 27 GroupsScreen tests passing (was 16 in Round 10 — added 11 tests for move up/down, drag-to-reorder, rename via prompt, cancel rename)
- TypeScript: clean (0 new errors — pre-existing native module type errors only)
- ESLint: 0 errors, 0 warnings

## Previous Round (Session 2026-07-10 — Round 10)

### Changes (Round 10 — Auto-Assign Rules, Webhooks, Docker, i18n)

- **Auto-assign rules**: Regex-based rules to auto-assign miners to groups by IP/name/tag. GroupsScreen has rule editor modal, toggle/delete/edit/apply. miners store: load/save/apply rules with regex + substring fallback. First matching rule wins.
- **Backend webhooks**: `sendWebhook()` POSTs to user-configured URL on miner alerts. `webhook_logs` table tracks delivery. GET/DELETE `/api/webhooks/logs` routes. All 6 push notification functions also send webhooks.
- **Backend caching**: In-memory `cacheMiddleware(ttl)` for GET responses, `invalidateCache(prefix?)`. Cleanup interval with `.unref()`.
- **Docker**: Multi-stage `backend/Dockerfile` (Node 22 Alpine, non-root user) + `docker-compose.yml` (Postgres 16 + backend).
- **i18n**: 20+ new English strings. DashboardScreen hardcoded strings (`Sort:`, `Group:`, `📍 Loc`, `🏷️ Tag`, `online`, `offline`, etc.) replaced with `t()` keys.
- **Markdown notes**: `MarkdownText` component for rich-text miner notes (bold, italic, code, links).
- **Web push**: VAPID-based browser push notification subscription in `pushRegistration.ts`.
- **Notifications on web**: `checkMinerAlerts` no longer short-circuits on web platform. Push gated by `Platform.OS !== 'web'`.
- **ESLint fix**: Removed unused `lastIndex` in `markdown.tsx`.
- **DashboardScreen test fix**: 2 lines using hardcoded `📍 Loc` → `dashboard.groupByLocation`.

### Test results

- Frontend: 1182 passing, 83 suites (12 new auto-assign + fixes)
- Backend: 194 passing, 22 suites (16 new webhook/cache/webhook-route)
- TypeScript: clean (0 errors) — frontend + backend
- ESLint: 0 errors, 0 warnings — frontend + backend

## Current State

- Tests: 1565 frontend (115 suites) + 242 backend (26 suites) = 1807 total, all passing.
- TypeScript: clean (0 errors) — frontend + backend
- ESLint: clean (0 warnings) — frontend + backend
- Themes: 14 total (dark, light, neon, matrix, 5tratum, crimson, ocean, lavender, midnight, nord, dracula, catppuccin, rosepine, system)
- Backend security: push token ownership check, proxy size limits, method allowlist, webhook pagination
- Backend logging: structured `log.error(...)` across all route files and services
- i18n: `react-i18next` configured with en/es/de/fr/ja/zh locales, imported in `App.tsx`. All screens use `useTranslation()` — no hardcoded UI strings remain. Accessibility labels kept as readable English (screen readers need human-readable text, not i18n keys).
- Auto-assign rules: fully implemented (UI + store + tests)
- Webhooks: fully implemented (service + routes + schema + tests + SettingsScreen UI)
- Docker: Dockerfile + docker-compose.yml ready
- Markdown notes: MinerDetailScreen renders notes with MarkdownText
- Web push: VAPID subscription support in pushRegistration.ts
- Notifications: web platform sends alerts (not just native)
- React.memo: all chart/display components memoized (EarningsCard, FirmwareBanner, MinerDrillDownModal, MinerSnapshotCard, NotificationPrefs, PoolCoverage, EfficiencyTrend, FanChart, HashrateChart, PowerChart, TemperatureChart, VoltageChart, OfflineBanner, MetricTile, ProfitabilityCard, ErrorBanner, WorldMap)
- Accessibility: 12 components have `accessibilityRole` + `accessibilityLabel` on root containers
- Backend: input validation on all routes, API key masking, generic error messages (no internal leak), try/catch on all route handlers
- CI: npm caching on all jobs, removed redundant web-lockfile job, Vercel token as env var, `!failure()` deploy condition
- Service constants: magic numbers extracted to named constants in 6 service files
- `__tests__/DashboardCustomizer.test.tsx`: 20 tests all passing (was 9/20). Key fix: use render result queries (`r.getByText(...)`) instead of `screen` singleton to avoid stale references; `await` all `fireEvent.changeText`/`fireEvent.press` calls for state flush
- `__tests__/AnalyticsScreen.test.tsx`: 20 tests all passing (was 17). Same `await fireEvent.press` fix for filter chip tests
- Coverage: thresholds: 78/85/90/90 (global branches/funcs/lines/stmts) — currently 83.54/91.95/96.24/94.38 (all thresholds met)
- Security: 0 vulns via `overrides` in package.json (nested for eas-cli deps)
- AnalyticsScreen: parallel snapshot fetch via `Promise.all`, LRU cache keyed by `minerCacheKey-range`, chart theme colors via refs (avoids recomputation on theme change)
- MinerDetailScreen: inline IP editing via TextInput on pencil icon tap, saves via `setMinerIp` store action
- Native SQLite: schema version tracking via `PRAGMA user_version` — guard ALTER TABLE behind version checks (no more unconditional runs on startup)
- CI: npm caching on all jobs, removed redundant web-lockfile job, Vercel token as env var, `!failure()` deploy condition, `working-directory` for Android build
- web bundle: 2.2MB / 820 modules. Top deps: RevenueCat ~800kB, react-dom 524kB, chart-kit ~200kB, react-native-svg ~70kB
- i18n: `react-i18next` configured with en/es/de/fr/ja/zh locales, imported in `App.tsx`. All screens use `useTranslation()` — no hardcoded UI strings remain. Accessibility labels kept as readable English (screen readers need human-readable text, not i18n keys).
- Skeleton loading: `SkeletonCard` replaces `ActivityIndicator` in DashboardScreen (initial load), AnalyticsScreen (chart loading), WalletsScreen (DB load)
- Design system: `src/utils/design.ts` provides spacing, radius, fontSize, fontWeight, cardShadow, cardStyle tokens
- RevenueCat: converted to dynamic `import()` for web compatibility
- Undo Toast: `UndoToast` component + `toast` store provides undoable confirmation for destructive actions (delete miner, remove group, delete wallet). Auto-confirms after 5s. Integrated into DashboardScreen, MinerDetailScreen, GroupsScreen, WalletsScreen.
- Push unregister: `unregisterPushToken()` called on logout to clean up push tokens on the server.
- Subscription listener: `listenForProChanges` registers callback during `initialize()` to reactively update store when pro status changes server-side.
- Settings Sync: `syncNow()` action in auth store pushes all user-visible settings (`theme_mode`, `power_cost`, `auto_scan`) to backend via `PUT /api/settings`, then pulls all settings from `GET /api/settings` and writes to local DB. Tracks `lastSyncTimestamp`. "Sync Now" button shown in SettingsScreen when authenticated. Button disabled while syncing, shows "Syncing..." label.
- Miner Comparison: `MinerComparisonScreen` shows side-by-side stats table for 2+ miners (hashrate, temp, power, efficiency, uptime, shares, frequency, voltage, best diff, pool). Best value highlighted in green, worst in red. Selection mode in DashboardScreen via "Compare" header button; tap miners to select, "Compare" button in bottom bar navigates with selected IDs.
- Batch Operations: DashboardScreen selection mode includes batch actions - "Group" button assigns group via Alert.prompt, "Wallet" button opens modal picker to assign wallet, "Delete" button shows confirmation then creates undo toasts for each miner. All batch actions operate on selected miners simultaneously.

## Hard-to-test (skipped)

- `networkStatus` unref check (line 35-41): Node.js-specific, `setInterval` in Jest returns number, not object with `.unref()`
- `refreshMiner` probe recovery (lines 186-203): requires complex mock orchestration
- `onNetworkReconnect` offline→online integration test: cannot reliably test with fake timers due to async polling timing vs React act() infrastructure
- `useTheme` subscribe cleanup (theme.ts:194): `useSyncExternalStore` cleanup on unmount not triggered by renderHook in test env

## Disk Space

The dev VM has a 100GB root partition that fills up to 99-100% frequently. When commands fail with `ENOSPC`/`nospc`:

- `rm -rf /tmp/jest_rs` (Jest cache, ~190MB)
- `rm -rf /home/aktheman/.npm/_cacache` (npm cache, ~1GB)
- `rm -rf /home/aktheman/.npm/_cacache` (npm cache, ~1GB)
- `rm -rf /home/aktheman/.npm/_logs`
- `rm -rf /home/aktheman/.npm/_npx` (npx cache, ~424MB)
- `sudo apt-get clean` (apt cache, ~321MB)
- `rm -rf /home/aktheman/.cache`

## Memoization

- `MetricTile`, `ProfitabilityCard`, `ErrorBanner`, `WorldMap`, `EarningsCard`, `FirmwareBanner`, `MinerDrillDownModal`, `MinerSnapshotCard`, `NotificationPrefs`, `PoolCoverage`, `EfficiencyTrend`, `FanChart`, `HashrateChart`, `PowerChart`, `TemperatureChart`, `VoltageChart`, `OfflineBanner` all wrapped in `React.memo`
- `DashboardScreen.tsx` inline `metrics.recentUptimes.map(u => Math.round(u / 3600))` stabilized via `useMemo` — prevents MetricTile from re-rendering on every parent render (the map was creating a new array ref each time)

## Desktop Polish

- `electron/main.js`: Single-instance lock via `app.requestSingleInstanceLock()` — second instance focuses the first; window state persistence (position/size/maximized) saved to `userData/window-state.json`; full application menu (HashWatch, File, Edit, View, Help) with keyboard shortcuts for Settings/Import/Export
- `electron/preload.js`: Exposes `checkForUpdate()` (sends IPC to main) and `onNavigate()` (listens for menu-triggered navigation)
- `src/types/electron.d.ts`: Added `checkForUpdate` and `onNavigate` type declarations

## Offline Queue

- `src/store/auth.ts`: Added 5 more settings keys to `SYNCED_SETTINGS`: `notifications_enabled`, `language`, `auto_dark_hour`, `kiosk_mode`, `dashboard_sections`; login/register now call `pushSettingsToBackend()` after `syncSettingsFromBackend()` to push queued settings on auth; queue items that failed to sync are kept for retry on next reconnect (instead of discarded after 3 retries)
- `__tests__/auth-store.test.ts`: Updated test to reflect queue keeps items for retry on reconnect

## AppNavigator Coverage

- `__tests__/AppNavigator.test.tsx`: Added test for notification tap handler (covers lines 182-184 in AppNavigator.tsx); total 14 tests (was 12)

## E2E Tests

- Playwright configured in `playwright.config.ts` (chromium, `serve dist` on port 4173)
- Tests in `e2e/` (10 files, 27 tests): pre-existing dashboard, analytics, settings, pools, user-journey tests; `app.spec.ts` added with 4 tests using `skipOnboarding`/`seedLocalStorage` helpers
- Verified: all 4 app.spec.ts e2e tests pass locally against the web build

## Test Debugging Notes

- **i18n mock**: `jest.setup.js` mocks `react-i18next` with a `t` function that returns the key (with `{{var}}` interpolation). Tests must assert against i18n keys (e.g., `'dashboard.title'`) not translated strings.
- **AnalyticsScreen duplicate-text**: "analytics.notEnoughData" appears twice (Hashrate History + Uptime History). Use `getAllByText`/`queryAllByText` to avoid "multiple elements"

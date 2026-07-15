# STATUS

## Session Summary (2026-07-15 — Round 15)

### Done

- **Push Token Ownership Check**: `POST /api/push/register` now checks if token already belongs to a different user → 409 error. Prevents token hijacking.
- **Proxy Security**: Response size limits (`maxContentLength: 1MB`, `maxBodyLength: 1MB`) on axios proxy requests. Flash endpoint restricted to POST/PUT methods only.
- **Webhook Logs Pagination**: `GET /api/webhooks/logs` now returns `{ logs, total, limit, offset }` instead of plain array. Supports `limit` and `offset` query params.
- **Structured Logging**: Replaced `console.error` with structured `log.error(...)` across 8 route files + minerPoller + pushNotifications + poolAnalytics + all init files.
- **Poll Re-entrancy Guard**: `miners.ts` store now tracks `let refreshing = false` flag to prevent concurrent `refreshAll` calls from overlapping network requests.
- **ESLint Cleanup**: Removed 7 unused callback extractions in `DashboardCustomizer.tsx`.
- **OpenAPI Spec Expansion**: Added 5 new endpoint groups (webhooks/logs, pool-analytics, group shares, proxy/pool, proxy/flash-firmware) + 5 new schemas.
- **Test Fixes**: Updated `push.test.ts` (token ownership mock) and `webhooks.test.ts` (paginated response format).

### Test Results

- **Frontend**: 1433 tests passing (104 suites) — ESLint clean
- **Backend**: 218 tests passing (24 suites) — 1 flaky test in isolation only (alertHistory mock leak)
- **Total**: 1651 tests

---

## Session Summary (2026-07-14 — Round 14)

### Done

- **Crash Bug Fixes**:
  - `notifications.ts:152`: `JSON.parse(raw)` wrapped in try/catch — malformed DB data no longer crashes alert check loop
  - `MinerDetailScreen.tsx:1516`: `BitAxeClient.restart()` wrapped in try/catch — network errors handled gracefully

- **Timer `.unref()` Compliance**: All 6 missing `.unref()` calls added per project policy:
  - `toast.ts:27` — undo auto-confirm timer
  - `websocket.ts:64` — reconnect timer
  - `FirmwareUpdateBanner.tsx:79` — success dismiss timer
  - `backend/ws.ts:86` — WebSocket heartbeat interval
  - `backend/services/poolAnalytics.ts:16` — fetch abort timeout

- **i18n Completion**: 11 new keys added across all 6 locales (en/es/fr/de/ja/zh):
  - SettingsScreen: `noActiveEntitlements`, `webhookSaved`, `updateAvailable`, `csvErrors`, `noValidRows`, `checkCsvColumns`, `download`
  - MinerDetailScreen: `locationHome`, `locationOffice`, `locationDataCenter`, `locationMiningFarm`, `locationColocation`, `powerModeStandard`, `powerModeECO`
  - ImportDataScreen: `invalidData`
  - ExportReportScreen: reused `common.online`/`common.offline`

- **Backend Input Validation**: 8 route files hardened:
  - `alertRules.ts`: numeric field range validation (0-200 temps, 0-100%, 0-1440 min, 0-8760 hrs)
  - `settings.ts`: key/value length limits (100/10000 chars)
  - `poolChanges.ts`: timestamp validation
  - `groupShares.ts`: email regex validation + generic error messages (no internal leak)
  - `poolAnalytics.ts`: API key masking in responses (shows `****` + last 4)
  - `miners.ts`, `stats.ts`, `notificationHistory.ts`: try/catch with generic 500 errors

- **React.memo**: 13 chart/display components wrapped to skip unnecessary re-renders:
  - EarningsCard, FirmwareBanner, MinerDrillDownModal, MinerSnapshotCard, NotificationPrefs, PoolCoverage, EfficiencyTrend, FanChart, HashrateChart, PowerChart, TemperatureChart, VoltageChart, OfflineBanner

- **Accessibility**: 12 components added `accessibilityRole` + `accessibilityLabel`:
  - EarningsCard, MinerSnapshotCard, PoolCoverage, PoolChangeHistory, Skeleton, SkeletonCard, TimeAgo, HealthPredictionCard, MinerHealthScore, PoolUptime, PowerUsageChart, ProfitabilityCard

- **CI Pipeline Optimization**:
  - Added `cache: npm` to frontend, web-build, e2e, and deploy jobs
  - Removed redundant `web-lockfile` job (was duplicating frontend test suite)
  - Fixed Vercel token passed as env var instead of CLI arg (security)
  - Added `!failure()` to deploy condition
  - Android build uses `working-directory` instead of shell `cd`

- **Magic Numbers → Constants**: 6 service files cleaned up:
  - `firmwareUpdate.ts`: `FIRMWARE_CHECK_TIMEOUT_MS`, `FIRMWARE_FLASH_TIMEOUT_MS`, `AXEOS_GITHUB_REPO`
  - `notifications.ts`: `OFFLINE_REMINDER_TEXT`
  - `networkStatus.ts`: `POLL_INTERVAL_MS`
  - `autoTheme.ts`: `AUTO_THEME_CHECK_INTERVAL_MS`
  - `websocket.ts`: `RECONNECT_DELAY_MS`
  - `dynamicIsland.ts`: `DYNAMIC_ISLAND_IOS_VERSION`

### Test Results

- **Frontend**: 1433 tests passing (104 suites) — TypeScript clean, ESLint clean
- **Backend**: 218 tests passing (24 suites)
- **Total**: 1651 tests
- **Snapshot**: 1 updated (SettingsScreen)

---

## Previous Session Summary (2026-07-14 — Round 13)

### Done

- **Pool Analytics**: Braiins/Luxor API integration for real earnings, luck, payout tracking.
  - Backend service + routes (`/api/pool-analytics`, config CRUD)
  - `pool_configs` DB table for API key storage
  - Frontend store + PoolAnalyticsScreen with provider selector, stats display, luck indicator
  - i18n in all 6 locales

- **Multi-user / Team Sharing**: Share miner groups with other users.
  - Backend `group_shares` table + 6 API endpoints (share, list, update, revoke, shared-miners)
  - Frontend `groupSharing` store + SharedGroupsScreen
  - Share modal in GroupsScreen (email input, access level, revoke)
  - i18n in all 6 locales

- **Custom Dashboards**: User-configurable widget layout.
  - Layout persistence (columns 1/2, compact mode, per-section size)
  - DashboardCustomizer enhanced with layout controls
  - DB setting `dashboard_layout` for persistence
  - i18n in all 6 locales

- **Firmware OTA Updates**: Push Bitaxe firmware updates from the app.
  - `firmwareUpdate.ts` service (GitHub releases check, proxy flash)
  - FirmwareUpdateBanner with progress bar, confirm/skip/error/success
  - Backend proxy routes (`/firmware-check`, `/flash-firmware`)
  - i18n in all 6 locales

- **Dark/Light Auto-Scheduling**: Auto-switch theme by time of day.
  - `autoTheme.ts` service (reads `auto_dark_hour` setting, handles crossing-midnight)
  - Runs on foreground + 5-min interval with `.unref()`
  - Wired into App.tsx lifecycle
  - 18 tests

- **Export Reports**: PDF/CSV export of miner performance.
  - `reportExport.ts` utility (CSV/JSON generation, date/miner filtering)
  - ExportReportScreen with date range, miner select, section toggles, format picker, preview
  - i18n in all 6 locales

- **Health Scoring Refinement**: Predictive maintenance.
  - `healthPredictions.ts` — 5 prediction types (fan failure, thermal throttle, hashrate decline, share rejection, power anomaly)
  - HealthPredictionCard with risk badges, probability bars, recommended actions
  - Wired into MinerDetailScreen
  - i18n in all 6 locales

- **Mobile Polish**: Haptics, live activities, dynamic island.
  - 8 new contextual haptic functions (minerOnline/Offline/Alert/Refresh, pullToRefresh, selection, destructive, navigation)
  - Live Activities service via expo-activitykit (with fallback)
  - Dynamic Island compact/expanded content (iOS 16+)
  - i18n in all 6 locales

- **Test Coverage Push**: 1433 frontend + 218 backend = 1651 total tests.
  - New tests for: firmware, dashboard layout, firmware banner, performance markers
  - All 104 frontend suites + 24 backend suites passing

- **Performance Profiling**: Bundle size reduction, lazy-loading.
  - Split DashboardComponents.tsx → MetricTile.tsx + ProfitabilityCard.tsx + barrel re-export
  - Lazy-loaded HealthPredictionCard, FirmwareUpdateBanner
  - Performance markers (markRenderStart/End, slow render detection)
  - Enhanced bundle analyzer (top 10 modules)
  - Optimized MinerDetailScreen re-renders (useMemo for healthPrediction)

### Test Results

- **Frontend**: TypeScript clean (0 errors), ESLint clean (0 warnings)
- **Backend**: 218 tests passing (24 suites)
- **Frontend**: 1433 tests passing (104 suites)
- **Total**: 1651 tests

---

## Previous Session Summary (2026-07-11 — Round 12)

### Done

- **Earnings Forecasting**: New `EarningsForecast` component added to AnalyticsScreen.
  - 1d/7d/30d/90d/1y BTC and USD projections based on total hashrate
  - Summary row: hashrate, miner count (online/total), total power
  - Net daily (after power cost) shown when power cost > 0
  - BTC price footer displayed
  - i18n keys in all 6 locales (en/es/fr/de/ja/zh)

- **Miner Health Dashboard Map**: WorldMap enhanced with health-colored status indicators.
  - Green dot = healthy (temp < 65, hashrate > 100)
  - Yellow dot = warning (temp > 65 or hashrate < 100)
  - Red dot = critical (temp > 80 or hashrate = 0)
  - Tooltip shows hashrate, temperature, and health label (Healthy/Warning/Critical/Offline)

- **Advanced Alerts**: share_rejection alert type + quiet hours fully implemented.
  - `shareRejectionPercent` column added to `miner_alert_rules` table
  - Backend routes, push notifications, webhook service, notification prefs all support `share_rejection`

- **Performance**: React.memo on 5 chart components, RevenueCat singleton, lazy loaded OnboardingScreen + WhatsNewModal.
  - Extracted `TILE_SIZE_STYLES`, `TILE_VALUE_SIZES`, `TAB_ICONS` outside component bodies
  - Metro config updated with `minifierConfig` for better tree-shaking (2-pass compression)

- **CI/CD Pipeline Fixes**: Consolidated duplicate jobs, graceful web deploy, conditional E2E.

- **Tests**: New tests for EarningsForecast (8) and WorldMap (14).

### Test Results

- **Frontend**: TypeScript clean (0 errors), ESLint clean (0 warnings)
- **Backend**: 194 tests passing (schema updated with `shareRejectionPercent`)
- **EarningsForecast**: 8 tests passing (title, summary, projections, net daily, empty, BTC price, total power)
- **WorldMap**: 14 tests passing (empty, online, offline, critical, warning, danger, multi-location, 10+ miners)

---

## Previous Session Summary (2026-07-10 — Round 11)

- **GroupsScreen i18n completion**: All remaining hardcoded strings in GroupsScreen now i18n'd.
  - `°C avg` display text → `t('groups.avgTemp', { temp })` with translations in all 6 locales
  - Auto-assign rules section: all 18 keys added to es/fr/de/ja/zh locale files (were missing from Round 10)
  - Accessibility labels kept as readable English (not i18n keys) — screen readers need human-readable text
  - 11 new GroupsScreen tests (move up/down, drag-to-reorder, rename via prompt, cancel rename)

### Test Results

- **Frontend**: 27 GroupsScreen tests passing (was 16)
- **TypeScript**: clean (0 new errors)
- **ESLint**: 0 errors, 0 warnings

---

## Previous Session Summary (2026-07-10 — Round 10)

### Done

- **Auto-assign rules**: Regex-based rules to automatically assign miners to groups based on IP, name, or tag patterns.
  - `AutoAssignRule` type: `{ id, field: 'ip'|'name'|'tag', pattern, group, enabled }`
  - `GroupsScreen`: Rule editor modal with field picker (IP/Name/Tag), pattern input (regex), target group input, toggle/edit/delete rules, "Apply Rules" button
  - `miners store`: `loadAutoAssignRules`, `saveAutoAssignRules`, `applyAutoAssignRules` (single miner), `applyAutoAssignRulesAll` (all miners). Regex with `i` flag; falls back to `string.includes()` on invalid regex. First matching rule wins.
  - 12 new tests in `miners-store.test.ts`: load/save rules, regex match, name match, disabled skip, unknown miner, invalid regex fallback, applyAll, first-match-wins, no-rules skip

- **Backend webhooks**: HTTP webhook delivery on miner alerts.
  - `sendWebhook(userId, payload)`: reads `webhook_url` from `user_settings`, POSTs JSON payload with 10s timeout, logs success/failure to `webhook_logs` table
  - `webhook_logs` schema: `id, userId, event, url, status, responseCode, sentAt`
  - Routes: `GET /api/webhooks/logs` (last 50), `DELETE /api/webhooks/logs` (clear user logs)
  - All 6 push notification functions (`sendMinerOfflineNotification`, etc.) now also call `sendWebhook`
  - `SettingsScreen`: webhook URL input field + save button + description text
  - 16 new backend tests: webhook service (7), cache middleware (8), webhooks routes (3)

- **Backend caching**: In-memory cache middleware with TTL + prefix invalidation.
  - `cacheMiddleware(ttl)`: caches GET responses keyed by `originalUrl|authorization`, returns cached data on hit, monkey-patches `res.json` to store on miss
  - `invalidateCache(prefix?)`: clears all or prefix-matched entries
  - Cleanup interval (60s) removes expired entries with `.unref()` to avoid process leaks
  - Integrated in `index.ts`: `app.use('/api/', cacheMiddleware())`, `invalidateCache()` on startup/shutdown

- **Docker support**: Multi-stage Dockerfile + docker-compose.yml.
  - `backend/Dockerfile`: Node 22 Alpine, multi-stage (builder: tsc, runner: prod deps only), non-root `hashwatch` user
  - `docker-compose.yml`: Postgres 16 Alpine + backend service, health checks, env vars for DB_PASSWORD/JWT_SECRET/CORS_ORIGINS

- **i18n**: 20+ new English strings for DashboardScreen and other screens.
  - DashboardScreen: all hardcoded strings (`Sort:`, `Group:`, `Name`, `Hashrate`, `Temp`, `Off`, `📍 Loc`, `🏷️ Tag`, `online`, `offline`, `pool`, `active`, `Exit Kiosk`, `live monitor`) replaced with `t()` keys
  - GroupsScreen: auto-assign rules UI uses `t()` keys (i18n completed in Round 11)

- **Markdown notes**: `MarkdownText` component for rich-text rendering in miner notes.
  - Supports: **bold**, _italic_, **_bold italic_**, `code`, [links](url)
  - `MinerDetailScreen`: notes rendered with `MarkdownText` instead of plain `Text`

- **Web push registration**: Browser push notification support via VAPID.
  - `pushRegistration.ts`: `registerWebPush()` subscribes via `PushManager`, sends subscription to backend
  - `service-worker.js`: improved caching + push event handler

- **Notifications on web**: `checkMinerAlerts` no longer short-circuits on `Platform.OS === 'web'`. Push notifications gated by `Platform.OS !== 'web'` in `send()`.

- **ESLint fix**: Removed unused `lastIndex` variable in `markdown.tsx`

- **DashboardScreen test fix**: Updated 2 test lines using hardcoded `📍 Loc` to use i18n key `dashboard.groupByLocation`

### Test Results

- **Frontend**: 1182 tests passing, 83 suites (12 new auto-assign tests + DashboardScreen fixes)
- **Backend**: 194 tests passing, 22 suites (16 new webhook/cache/webhook-route tests)
- **TypeScript**: clean (0 errors) — both frontend and backend
- **ESLint**: 0 errors, 0 warnings — both frontend and backend

### Remaining

- Disk space: VM at 100% disk utilization; commands time out intermittently. Can free ~1GB by removing `app-builder-bin`, `electron-builder`, etc. if not building desktop.
- E2E web build: not re-run this session due to disk space constraints.
- CI: Deploy Web fails (missing Vercel secrets), E2E (Playwright) fails (no backend in CI), iOS Build Check fails (no Apple account). All pre-existing infrastructure issues.

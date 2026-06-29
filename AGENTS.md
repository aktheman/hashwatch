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

- `__tests__/miners-store.test.ts`: 38 tests covering load/add/remove/refresh/sync/snapshots/wallet/group
- `__tests__/miners-store-edge.test.ts`: 7 tests — AppState pause/resume, interval tick (paused/not-paused), onAuthLogin callback, scanNetwork error/success, offline retry
- `__tests__/widget.test.tsx`: 3 tests (Android guard, native module call, missing module)
- `__tests__/authToken.test.ts`: 6 tests (getter, setter, login callbacks)
- `__tests__/networkStatus.test.ts`: 11 tests (online, offline, null fallback, catch, multi-listener, cleanup, onNetworkReconnect staying-online, staying-offline, override) + 1 untestable branch comment
- `__tests__/version.test.ts`: 13 tests (parse, needsUpdate, fetch success/failure, changelog URL, fetchNetworkHashrate)
- `__tests__/theme.test.ts`: 22 tests (all 5 themes, setThemeMode, mode tracking, custom themes, useTheme hook, system mode web/non-web/matchMedia)
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
- `__tests__/GroupsScreen.test.tsx`: 16 tests (header, counts, all groups, empty, create, edit, duplicate, remove, rename fallback, miner groups)
- `__tests__/AppNavigator.test.tsx`: 12 tests (main app, all tabs, miner card, OfflineBanner, lazy fallback, navigation)
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
- `backend/openapi.json`: OpenAPI 3.0 spec with 14 paths, 22 schemas

## Current State

- React pinned to exact 19.2.3 (RN 0.85.3 renderer incompatible with 19.2.7)
- Tests: 1030 frontend (71 suites) + 105 backend (12 suites) = 1135 total
- `__tests__/DashboardCustomizer.test.tsx`: 20 tests all passing (was 9/20). Key fix: use render result queries (`r.getByText(...)`) instead of `screen` singleton to avoid stale references; `await` all `fireEvent.changeText`/`fireEvent.press` calls for state flush
- `__tests__/AnalyticsScreen.test.tsx`: 20 tests all passing (was 17). Same `await fireEvent.press` fix for filter chip tests
- Coverage: thresholds: 78/85/90/90 (global branches/funcs/lines/stmts) — currently 83.54/91.95/96.24/94.38 (all thresholds met)
- Security: 0 vulns via `overrides` in package.json (nested for eas-cli deps)
- AnalyticsScreen: parallel snapshot fetch via `Promise.all`, LRU cache keyed by `minerCacheKey-range`, chart theme colors via refs (avoids recomputation on theme change)
- MinerDetailScreen: inline IP editing via TextInput on pencil icon tap, saves via `setMinerIp` store action
- Native SQLite: schema version tracking via `PRAGMA user_version` — guard ALTER TABLE behind version checks (no more unconditional runs on startup)
- CI: removed duplicate coverage step (npx jest --coverage --silent), made `npm audit` non-blocking (`|| echo`)
- web bundle: 2.2MB / 820 modules. Top deps: RevenueCat ~800kB, react-dom 524kB, chart-kit ~200kB, react-native-svg ~70kB
- i18n: `react-i18next` configured with en/es locales, imported in `App.tsx`. All screens use `useTranslation()` — no hardcoded strings remain.
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

- `MetricTile`, `ProfitabilityCard`, `ErrorBanner`, `WorldMap` all wrapped in `React.memo` to skip re-renders when parent re-renders but props haven't changed
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
- **AnalyticsScreen duplicate-text**: "analytics.notEnoughData" appears twice (Hashrate History + Uptime History). Use `getAllByText`/`queryAllByText` to avoid "multiple elements" errors.
- **AppNavigator miner card**: `DB.loadMiners` mock must return desired miners; the real `loadMiners()` in the store calls `DB.loadMiners()` internally and overwrites any `setState`-preset miners. Mock `refreshAll` to `jest.fn()` to prevent `refreshMiner` from crashing on incomplete mock miner data.
- **BitAxeClient mock for navigator tests**: Must be a constructor mock (`jest.fn().mockImplementation(...)`) with `fetchAll`, not just `{ probe: jest.fn() }`, because `refreshMiner` calls `new BitAxeClient(...)`.
- **Cross-test leak**: `jest.clearAllMocks()` preserves `mockResolvedValue`. Reset shared mocks explicitly in `beforeEach`.
- **`screen` singleton staleness**: `import { screen } from '@testing-library/react-native'` captures `defaultScreen` at import time via CJS destructuring. `render()` updates `exports.screen` via `setRenderResult`, but the local `screen` binding remains `defaultScreen` → `getBy*` throws "render function has not been called". Fix: use render result (e.g., `const r = await render(...)` then `r.getByText(...)`) instead of `screen` singleton.
- **`fireEvent` is async**: In RNTL v14, `fireEvent.press`, `fireEvent.changeText` etc. are `async` and wrap handlers in `act`. Without `await`, state updates are not flushed before subsequent assertions. Always `await fireEvent.*(...)` to ensure React state is settled.

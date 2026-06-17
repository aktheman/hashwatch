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
- `__tests__/miners-store-edge.test.ts`: 6 tests — AppState pause/resume, interval tick (paused/not-paused), onAuthLogin callback, scanNetwork error/success
- `__tests__/widget.test.tsx`: 3 tests (Android guard, native module call, missing module)
- `__tests__/authToken.test.ts`: 6 tests (getter, setter, login callbacks)
- `__tests__/networkStatus.test.ts`: 7 tests (online, offline, null fallback, catch, multi-listener, cleanup) + 1 untestable branch comment
- `__tests__/version.test.ts`: 13 tests (parse, needsUpdate, fetch success/failure, changelog URL, fetchNetworkHashrate)
- `__tests__/theme.test.ts`: 17 tests (all 5 themes, setThemeMode, mode tracking, custom themes)
- `__tests__/api-client.test.ts`: 28 tests (auth, interceptors, caching, error handling)
- `__tests__/DashboardScreen.test.tsx`: 27 tests (filtering, upgrade banner, error banner, scanning, wallet/group filters, temp display)
- `__tests__/WalletsScreen.test.tsx`: 14 tests (CRUD, modal, color picker, validation)
- `__tests__/MinerDetailScreen.test.tsx`: 14 tests (rendering, share, delete, offline, not-found, goBack)
- `__tests__/SettingsScreen.test.tsx`: 23 tests (theme, remote sync, auth, power cost, exports)
- `__tests__/AddMinerScreen.test.tsx`: 14 tests (pro limit, add error, scan cancel, scan fail, discovered list, add discovered, scan progress)
- `__tests__/AnalyticsScreen.test.tsx`: 10 tests (summary stats, range selectors, chart, Power Cost, static labels, empty state)
- `__tests__/ImportDataScreen.test.tsx`: 8 tests (empty input, importing state, button disabled, success, singular, failure, non-Error throw)
- `__tests__/GroupsScreen.test.tsx`: 16 tests (header, counts, all groups, empty, create, edit, duplicate, remove, rename fallback, miner groups)
- `__tests__/AppNavigator.test.tsx`: 5 tests (main app, all tabs, miner card, OfflineBanner, lazy fallback)
- `__tests__/constants.test.ts`: 10 tests (getExtra, getProxyUrl, setProxyUrl success/DB failure, initProxyUrl saved/null/error)
- `__tests__/bitaxe.test.ts`: 18 tests (system info, miner status, fetchAll, restart, probe with fallback paths, non-primary paths, wifi fields)
- `__tests__/bitaxe-web.test.ts`: 13 tests (web proxy for info/status/fetchAll/restart/probe, auth header injection, error handling)
- `.github/workflows/ci.yml`: CI pipeline with backend, frontend, web-build, iOS build, deploy, e2e
- `backend/openapi.json`: OpenAPI 3.0 spec with 14 paths, 22 schemas

## Current State

- React pinned to exact 19.2.3 (RN 0.85.3 renderer incompatible with 19.2.7)
- Tests: 524 frontend (49 suites) + 37 backend (6 suites) = 561 total
- Coverage: thresholds: 50/50/60/60
  - constants.ts: 100% stmts/funcs/branches/lines
  - bitaxe.ts: 94.84% stmts, 93.49% branches, 84.21% funcs, 97.61% lines
  - miners.ts: 97.75% stmts, 79.62% branches, 96.15% funcs, 100% lines
  - networkStatus.ts: 100% stmts, 86.66% branches, 100% funcs, 100% lines
- web bundle: 2.0MB / 781 modules. Top deps: RevenueCat ~800kB, react-dom 524kB, chart-kit ~200kB, react-native-svg ~70kB
- AppNavigator code-split: all 10 screens use `React.lazy(() => import(...).then(m => ({ default: m.ScreenName })))` wrapped in `<Suspense>` — enables Metro to create separate chunks per screen
- `formatTemperature` now accepts `number | undefined | null`, returns `'--'` for nullish
- Timer `unref()` calls added in `hashrate.ts` (fetchBTCPrice, fetchNetworkHashrate, startPricePolling) to prevent Jest worker leaks
- Security: 24→6 vulns via `overrides` (node-forge 1.4.0, tar 7.5.16); remaining 6 require `--force` (downgrades eas-cli)

## Hard-to-test (skipped)

- `networkStatus` unref check (line 35-41): Node.js-specific, `setInterval` in Jest returns number, not object with `.unref()`
- `refreshMiner` probe recovery (lines 186-203): requires complex mock orchestration

## Test Debugging Notes

- **AnalyticsScreen duplicate-text**: "Not enough data yet. Keep miners running." appears twice (Hashrate History + Uptime History). Use `getAllByText`/`queryAllByText` to avoid "multiple elements" errors.
- **AppNavigator miner card**: `DB.loadMiners` mock must return desired miners; the real `loadMiners()` in the store calls `DB.loadMiners()` internally and overwrites any `setState`-preset miners. Mock `refreshAll` to `jest.fn()` to prevent `refreshMiner` from crashing on incomplete mock miner data.
- **BitAxeClient mock for navigator tests**: Must be a constructor mock (`jest.fn().mockImplementation(...)`) with `fetchAll`, not just `{ probe: jest.fn() }`, because `refreshMiner` calls `new BitAxeClient(...)`.
- **Cross-test leak**: `jest.clearAllMocks()` preserves `mockResolvedValue`. Reset shared mocks explicitly in `beforeEach`.

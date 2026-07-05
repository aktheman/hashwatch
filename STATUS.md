# STATUS

## Session Summary (2026-07-05)

### Done

- **Backend: Added POST /api/proxy/flash endpoint** — firmware OTA update proxying with 120s timeout, URL validation, error handling. Frontend `bitaxe.ts:flashFirmware()` was calling this but it returned 404.
- **Backend: Fixed OpenAPI spec** — corrected `/alert-rules/{minerId}` → `/miner-alert-rules/{minerId}` path mismatch
- **Backend: Added flash endpoint tests** — 4 new tests (success, 400, 403, 502)
- **MinerDetailScreen: Alert Rules configuration UI** — `AlertRuleSlider` component with +/- steppers for temp threshold, hashrate drop %, offline reminder, uptime threshold. Toggle enable/disable switch. Saves via `setAlertRules()` (local DB + backend sync when authenticated)
- **Bundle analysis tooling** — added `source-map-explorer` dev dep, `build:web:analyze` script with `--dump-sourcemap`
- **expo-modules-core mock** — comprehensive mock file at `src/__mocks__/expo-modules-core.ts` covering EventEmitter, NativeModule, SharedObject, SharedRef, CodedError, UnavailabilityError, requireNativeModule, requireOptionalNativeModule, Platform, uuid, PermissionStatus — available for selective test use
- **E2E tests** — 3 new files (dashboard-metrics, groups, miner-detail) with 11 tests covering time range chips, drill-down modal, group display, alert rules
- **Charts: Power, Voltage, Fan Speed** — 3 new trend chart components on MinerDetailScreen (amber power, cyan voltage, green fan RPM). Added `fanSpeed`, `fanRpm`, `coreVoltage` to `MinerSnapshot` type and `buildSnapshot()` for forward data collection. 18 new tests (6 each).
- **NotificationHistoryScreen** — full-screen FlatList with group-by-date, status badges (✅/❌), refresh, clear-all with confirmation. Registered in AppNavigator/RootStackParamList. Nav link added to Settings.
- **Push toggle fix** — Settings push notifications switch now calls `registerPushToken`/`unregisterPushToken` with backend (previously only saved local DB setting).
- **Vercel redeploy** — https://hashwatch2.vercel.app live with latest changes
- **Local web server** — http://localhost:3000

### Test Results

- **Frontend**: 1164 tests passing, 83 suites (was 1141/79)
- **Backend**: 163 tests passing, 17 suites (was 129/14)
- **TypeScript**: clean
- **ESLint**: 0 errors, 0 warnings

### Test Architecture Note

- `jest.mock` calls with module-level `const` variables must be placed **before** the `import` statement in test files. This avoids Temporal Dead Zone issues and prevents `expo/src/winter/fetch/FetchResponse` from breaking Jest's babel transform.

### Remaining

- `expo-modules-core` mock is available at `src/__mocks__/expo-modules-core.ts` but NOT globally activated in `jest.setup.js` — adding it globally still breaks 76 test suites. Available for selective import in specific tests.
- Web bundle size at 1.8MB (improved from 2.2-2.7MB). Metro doesn't support code-splitting for web. To get true lazy loading, would need to switch bundler to webpack/Vite (requires Expo SDK downgrade or custom build pipeline).

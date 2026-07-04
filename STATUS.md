# STATUS

## Session Summary (2026-07-04)

### Done

- **Fixed 6 ESLint unused-variable warnings**: `DashboardComponents` (unused fontWeight), `DashboardCustomizer` (unused buttonText), `ErrorBoundary` (unused buttonText), `StatWidget` (unused radius), `export.ts` (unused SnapshotKey, hps, toHashesPerSecond)
- **Migrated hardcoded styles to design tokens** in 10+ files: `ChartWidgets`, `EfficiencyTrend`, `PoolChangeHistory`, `PoolCoverage`, `AlertHistoryScreen`, `ImportDataScreen`, `EarningsCard`, `FirmwareBanner`, `Skeleton`, `SkeletonCard`, `OnboardingScreen`, `SubscriptionScreen`, `DashboardComponents` (all fontWeight strings)
- **Updated stale snapshot** in `snapshots.test.tsx`
- **Fixed flaky `AppNavigator` test** (await `fireEvent.press`)
- **Fixed 4 backend vulns** (js-yaml, undici) → 0 remaining
- **Added probe recovery test** in `miners-store-edge.test.ts`: verifies `BitAxeClient.probe` is called when a miner has `apiPath: undefined` and `fetchAll` fails
- **Added sync coverage** in `alertHistory-store.test.ts`: 7 new tests for `syncFromBackend` (merge, dedup, syncing flag, error handling) + `syncToBackend` (send unread, skip when none, error handling)
- **Confirmed all 6 i18n locales** have 100% key coverage
- **Total tests**: 1100 passing, 79 suites (was 1091/79). Backend: 129/129
- **TypeScript**: clean (`npx tsc --noEmit`)
- **ESLint**: 0 errors, 0 warnings

### Test Architecture Note

- `jest.mock` calls with module-level `const` variables must be placed **before** the `import` statement in test files. This avoids Temporal Dead Zone issues and prevents `expo/src/winter/fetch/FetchResponse` from breaking Jest's babel transform.

### Remaining

- `expo-modules-core` mock cannot be added globally to `jest.setup.js` — it breaks 76 test suites. The mock needs `requireNativeModule`, `requireOptionalNativeModule`, `EventEmitter`, `NativeModule`, `SharedObject`, `SharedRef`, and the `expo` main module re-exports.
- Web bundle size increase (2.2MB → 2.7MB) still under investigation

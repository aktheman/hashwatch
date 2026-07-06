# STATUS

## Session Summary (2026-07-06)

### Done

- **Design token audit (all screens/components)** — Replaced ~60+ hardcoded spacing/fontSize/fontWeight/radius values with design system tokens across 9 files:
  - `SettingsScreen.tsx`: 25+ values replaced (badge, auth, themeBtn, inline button/language/dark mode styles)
  - `PoolsScreen.tsx`: 30+ values replaced (header, card, pool/stat/miner rows, changeBadge, comparison table)
  - `MinerComparisonScreen.tsx`: 12+ values replaced (header, table, label/cell/miner/empty styles)
  - `MinerDetailScreen.tsx`: 8 values replaced (poolCard, poolDivider, notes, emoji, AlertRuleSlider)
  - `DashboardCustomizer.tsx`: inline paddingVertical
  - `MinerCard.tsx`: marginVertical, marginHorizontal, tag borderRadius/padding
  - `WorldMap.tsx`: paddingVertical, fontSize (tooltip)
  - `TemperatureChart.tsx`: marginVertical (container + empty state)
  - `AddMinerScreen.tsx`: marginVertical, marginHorizontal, inline fontSize
  - `AnalyticsScreen.tsx`: marginHorizontal, marginBottom (chartCard)
  - `DashboardScreen.tsx`: inline marginHorizontal
- **NotificationHistoryScreen tests** — Added 2 new tests (multiple items in same date group, empty body rendering), migrated `fireEvent.press` to async, total 6 tests. All passing.
- **E2E tests** — Added 3 new spec files covering uncovered screens:
  - `wallets.spec.ts`: 3 tests (navigate, seeded wallet, empty state)
  - `notification-history.spec.ts`: 2 tests (navigate, empty state)
  - `alert-history.spec.ts`: 2 tests (navigate, empty state)

### Test Results

- **Frontend**: 1166 tests passing, 83 suites
- **Backend**: 163 tests passing, 17 suites
- **TypeScript**: clean (0 errors)
- **ESLint**: 0 errors, 0 warnings

### Test Architecture Note

- `jest.mock` calls with module-level `const` variables must be placed **before** the `import` statement in test files. This avoids Temporal Dead Zone issues and prevents `expo/src/winter/fetch/FetchResponse` from breaking Jest's babel transform.

### Remaining

- `expo-modules-core` mock is available at `src/__mocks__/expo-modules-core.ts` but NOT globally activated in `jest.setup.js` — adding it globally still breaks 76 test suites. Available for selective import in specific tests.
- Web bundle size at 1.8MB (improved from 2.2-2.7MB). Metro doesn't support code-splitting for web. To get true lazy loading, would need to switch bundler to webpack/Vite (requires Expo SDK downgrade or custom build pipeline).
- DashboardCustomizer: drag-to-reorder not yet implemented (requires significant effort — no drag-and-drop library currently in the project).

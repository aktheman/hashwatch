# STATUS

## Session Summary (2026-07-06)

### Done

- **NotificationPrefs sync fix** — When authenticated, toggle saves to **backend first, then local DB**. If backend fails, local is untouched (no inconsistent state). On load, backend prefs are synced to local DB so `checkMinerAlerts()` sees correct values. Backend fetch failure falls back to local prefs instead of rendering empty UI.
- **Removed duplicate alert thresholds** — Old inline preset buttons (temp/hashrate 75°C, hashrate drop 60%) removed from MinerDetailScreen. The AlertRuleSlider section (toggle + 4 sliders) is now the sole alert rules UI. Tests updated to verify slider adjustment instead.
- **Duplicate pushRegistration mock fix** — SettingsScreen.test.tsx had two `jest.mock` calls for the same path; updated both to export `registerPushToken` + `unregisterPushToken`.

### Test Results

- **Frontend**: 1164 tests passing, 83 suites
- **Backend**: 163 tests passing, 17 suites
- **TypeScript**: clean
- **ESLint**: 0 errors, 0 warnings

### Test Architecture Note

- `jest.mock` calls with module-level `const` variables must be placed **before** the `import` statement in test files. This avoids Temporal Dead Zone issues and prevents `expo/src/winter/fetch/FetchResponse` from breaking Jest's babel transform.

### Remaining

- `expo-modules-core` mock is available at `src/__mocks__/expo-modules-core.ts` but NOT globally activated in `jest.setup.js` — adding it globally still breaks 76 test suites. Available for selective import in specific tests.
- Web bundle size at 1.8MB (improved from 2.2-2.7MB). Metro doesn't support code-splitting for web. To get true lazy loading, would need to switch bundler to webpack/Vite (requires Expo SDK downgrade or custom build pipeline).

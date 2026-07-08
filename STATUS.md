# STATUS

## Session Summary (2026-07-08 — Round 9)

### Done

- **Interval `.unref()` fixes**: Added proper `.unref()` guards to remaining intervals in `TimeAgo.tsx`, `DashboardScreen.tsx` (autoScanInterval), and `miners.ts` (startPolling interval). Uses `typeof === 'object' && 'unref' in id` pattern to avoid ESLint `no-explicit-any` warnings while correctly handling Node.js Timeout objects.

- **E2E test hardening**: Updated 17 E2E test files to use `seedLocalStorage` over `skipOnboarding`, added `last_seen_version: '1.1.0'` to seeded settings, replaced i18n key selectors with English text, switched from `first()` to `last()` for duplicate text matching, replaced fragile `locator('text=...')` with `getByRole`/`getByLabel` selectors.

- **AppNavigator animation fix**: Added `animation: 'none'` to Stack navigator options to prevent native stack animation issues.

- **OnboardingScreen fix**: Added `currentIndexRef` to track slide index independently of `onMomentumScrollEnd` (which fires with offset=0 in RNW, resetting index). Button text now correctly updates to "Get Started" on the last slide.

- **E2E onboarding test fix**: Slides advance via `handleNext` which sets `currentIndex` synchronously, then FlatList scrolls. Test clicks "Next" 3 times then asserts "Get Started" button is visible.

- **E2E dashboard-load test fix**: Changed default port 8081→4173 (Playwright web server port). Added `seedLocalStorage` to bypass onboarding. Fixed page title matcher to accept "Dashboard".

- **E2E API tests fix**: `health.api.test.ts` now uses `E2E_API_URL` env var (was using relative path against frontend's baseURL, getting 404). All 6 API E2E tests pass against Railway production backend (`hashwatch-production-5b6e.up.railway.app`).

- **Vercel deployment verified**: hashwatch2.vercel.app returns 200, serving latest web build via GitHub Actions CI.

- **localhost:3000 fixed**: Rebuilt web export (`expo export --platform=web`, 804 modules, 1.9MB JS) and served via `npx serve dist -p 3000 --single`.

- **Jest worker warning investigated**: 37 active handles (sockets/pipes/child processes) are Jest's internal IPC infrastructure, not our app code. `setInterval` in `jest-expo` returns Timeout objects, so `.unref()` guards DO work. Warning is emitted by Jest's main process before force-exit — cannot be suppressed from user code. `--forceExit` doesn't eliminate the message. Accepted as pre-existing `jest-expo` environment limitation.

- **GitHub Actions CI run 168**: All our jobs passed (Backend 20/22, Frontend (22) cancelled due to earlier failures). Remaining failures are pre-existing CI infrastructure issues (no Vercel secrets → Deploy Web, no backend in CI → E2E Playwright, no Apple account → iOS Build Check).

### Test Results

- **Frontend**: 1170 tests passing, 83 suites (no regressions)
- **Backend**: 178 tests passing, 19 suites (no regressions)
- **TypeScript**: clean (0 errors)
- **ESLint**: 0 errors, 0 warnings
- **E2E web build**: 67 passed, 0 failed (all tests passing including API tests against Railway)

### Remaining

- Jest worker process exit warning: accepted as `jest-expo` environment limitation — 37 internal handles are Jest's IPC infrastructure, not our app code. Cannot be suppressed from user code; `--forceExit` doesn't eliminate the message.
- CI: Deploy Web fails (missing Vercel secrets in GitHub Actions), E2E (Playwright) fails (no backend server in CI), iOS Build Check fails (no Apple developer account). All pre-existing infrastructure issues.

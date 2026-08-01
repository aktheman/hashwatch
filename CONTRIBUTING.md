# Contributing to HashWatch

Thanks for wanting to contribute! This guide covers how to contribute code, what conventions to follow, and how to get your changes reviewed and merged.

## Prerequisites

- Node.js 22+
- PostgreSQL 16 (for backend)
- Xcode 15+ (for iOS)
- Android Studio (for Android)

## How to Contribute

1. **Fork** the repository on GitHub (`https://github.com/aktheman/hashwatch`).
2. **Clone** your fork and add the upstream remote:

   ```bash
   git clone https://github.com/your-username/hashwatch.git
   cd hashwatch
   git remote add upstream https://github.com/aktheman/hashwatch.git
   ```

3. **Create a branch** with a descriptive prefix (see [Branch Naming](#branch-naming)):

   ```bash
   git checkout -b feat/dark-pool-screen
   ```

4. **Make your changes** and commit them with [Conventional Commits](#commit-messages).
5. **Push** and open a **Pull Request** against `main`. Reference the issue if one exists.

```bash
git push -u origin feat/dark-pool-screen
```

## Branch Naming

Use descriptive prefixes:

- `feat/` — New features (e.g., `feat/dark-pool-screen`)
- `fix/` — Bug fixes (e.g., `fix/push-token-ownership`)
- `test/` — Test additions/fixes (e.g., `test/alert-rules`)
- `chore/` — Maintenance (e.g., `chore/upgrade-expo`)
- `docs/` — Documentation (e.g., `docs/api-reference`)

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add dark pool contribution screen
fix: prevent concurrent refreshAll calls
test: add webhook delivery edge cases
chore: update expo to 56.0.11
docs: document the errors endpoint
refactor: extract shared chart config
```

Supported prefixes: `feat:`, `fix:`, `test:`, `chore:`, `docs:`, `refactor:`, `perf:`, `build:`, `ci:`.

## Development Workflow

```bash
# Frontend dev server
npx expo start

# Web dev server
npm run web

# Backend (new terminal) — hot reload on port 4000
cd backend && npm install && npm run db:init && npm run dev

# Serve the production web build locally (port 3000)
npm run build:web
node serve.js
```

Useful scripts (see `package.json`):

| Script              | Description                      |
| ------------------- | -------------------------------- |
| `npm test`          | Frontend Jest tests              |
| `npm run test:e2e`  | Playwright end-to-end tests      |
| `npm run typecheck` | TypeScript type checking         |
| `npm run lint`      | ESLint (with `--max-warnings=0`) |
| `npm run format`    | Prettier check                   |
| `npm run build:web` | Production web build             |

## Code Conventions

- **Language** — TypeScript only, strict typing. Run `npx tsc --noEmit` before pushing.
- **Linting** — `npx eslint src/ --max-warnings=0`. ESLint 10 + Prettier 3 are configured; `npm run lint:fix` and `npm run format:fix` auto-fix.
- **No comments** in code unless explicitly requested.
- **Design tokens** — Use tokens from `src/utils/design.ts` (spacing, radius, fontSize, fontWeight, cardShadow, cardStyle) instead of hardcoded values.
- **Accessibility** — Add `accessibilityRole` and `accessibilityLabel` on root containers and interactive elements.
- **Performance** — Wrap components in `React.memo` when they render static content or are expensive to re-render; lazy-load heavy charts.
- **Timers** — Always call `.unref()` on intervals/timeouts so Jest workers don't leak.
- **i18n** — Use the `useTranslation()` hook; no hardcoded UI strings. Add keys to all 7 locale files (`src/i18n/en|es|fr|de|ja|zh|nb.json`). Accessibility labels stay as readable English.
- **Do NOT run `npm audit fix --force`** — it downgrades Expo and breaks the build.

## Test Conventions

- **Testing Library** — Use `@testing-library/react-native` v14 APIs (async `render`/`renderHook`, no `UNSAFE_getAllByType`).
- **`jest.mock` placement** — Mock modules with `jest.mock()` _before_ imports of the module under test.
- **Timers** — Timers in modules must call `.unref()`; tests that use them should restore with `afterEach(() => jest.restoreAllMocks())`.
- **Hidden elements** — Use `{ includeHiddenElements: true }` query option when accessibility-hidden elements are present.
- **i18n keys** — Assert against i18n keys (e.g., `'dashboard.title'`), not translated strings.
- **Queries** — Use render-result queries (`r.getByText(...)`) instead of the `screen` singleton to avoid stale references.
- **Async events** — Always `await fireEvent.changeText` / `fireEvent.press` calls for state flush.

### Running Tests

```bash
# Frontend
npx jest --no-coverage

# Backend
cd backend && npx jest --no-coverage

# E2E (build first)
npm run build:web
npm run test:e2e
```

## Pull Requests

Before submitting, ensure:

1. **All tests pass** — frontend `npx jest --no-coverage`, backend `cd backend && npx jest --no-coverage`
2. **TypeScript is clean** — `npx tsc --noEmit` (frontend + backend)
3. **ESLint is clean** — `npx eslint src/ --max-warnings=0`
4. **Prettier is clean** — `npm run format`
5. **No comments** added to code unless explicitly requested
6. **PR description** includes what changed and why, plus test/verification steps

## Code Review Checklist

- [ ] Conventional commit message matches the change
- [ ] Tests added/updated and all pass (frontend, backend, E2E where relevant)
- [ ] TypeScript and ESLint clean
- [ ] No hardcoded UI strings — i18n keys added to all 7 locales
- [ ] Design tokens used instead of magic numbers/values
- [ ] `accessibilityRole`/`accessibilityLabel` present on interactive elements
- [ ] Timers call `.unref()`
- [ ] `React.memo` applied where re-render cost matters
- [ ] Backend routes: input validated (Zod), try/catch with structured `log.error`, no internal details leaked
- [ ] No secrets or API keys introduced

## Disk Space

The dev VM has a 100GB root partition that can fill up. When commands fail with `ENOSPC`:

```bash
rm -rf /tmp/jest_rs                       # Jest cache (~190MB)
rm -rf ~/.npm/_cacache                    # npm cache (~1GB)
rm -rf ~/.npm/_npx                        # npx cache (~424MB)
rm -rf ~/.npm/_logs
sudo apt-get clean                        # apt cache (~321MB)
rm -rf ~/.cache
```

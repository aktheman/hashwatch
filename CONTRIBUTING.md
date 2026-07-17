# Contributing to HashWatch

## Prerequisites

- Node.js 22+
- Expo CLI (`npm install -g expo-cli`)
- PostgreSQL 16 (for backend)
- Xcode 15+ (for iOS)
- Android Studio (for Android)

## Development Setup

```bash
# Clone and install
git clone https://github.com/aktheman/hashwatch.git
cd hashwatch
npm install

# Backend setup
cd backend
cp .env.example .env  # configure DATABASE_URL, JWT_SECRET
npm install
npm run db:init
npm run dev

# Frontend (new terminal)
cd ..
npm start
```

## Branch Naming

Use descriptive prefixes:

- `feat/` -- New features (e.g., `feat/dark-pool-screen`)
- `fix/` -- Bug fixes (e.g., `fix/push-token-ownership`)
- `test/` -- Test additions/fixes (e.g., `test/alert-rules`)
- `chore/` -- Maintenance (e.g., `chore/upgrade-expo`)
- `docs/` -- Documentation (e.g., `docs/api-reference`)

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add dark pool contribution screen
fix: prevent concurrent refreshAll calls
test: add webhook delivery edge cases
chore: update expo to 56.0.11
```

Prefixes: `feat:`, `fix:`, `test:`, `chore:`, `docs:`, `refactor:`

## Pull Requests

Before submitting, ensure:

1. **All tests pass**
   - Frontend: `./node_modules/.bin/jest --no-coverage --maxWorkers=4`
   - Backend: `cd backend && ./node_modules/.bin/jest --no-coverage`

2. **TypeScript is clean**
   - Frontend: `npx tsc --noEmit`
   - Backend: `cd backend && npx tsc --noEmit`

3. **ESLint is clean**
   - Frontend: `npx eslint src/ --max-warnings=0`

4. **No comments** added to code unless explicitly requested

5. **PR description** includes what changed and why

## Code Style

- **No comments** in code unless the user explicitly requests them
- **Use design tokens** from `src/utils/design.ts` (spacing, radius, fontSize, fontWeight, cardShadow, cardStyle)
- **Accessibility** -- Add `accessibilityRole` and `accessibilityLabel` on root containers
- **Performance** -- Wrap components in `React.memo` when they render static content or are expensive to re-render
- **Timers** -- Always call `.unref()` on intervals/timeouts to prevent Jest worker leaks
- **i18n** -- Use `useTranslation()` hook; no hardcoded UI strings. Accessibility labels stay as readable English.
- **Testing Library** -- Use `@testing-library/react-native` v14 APIs (async `render`/`renderHook`, no `UNSAFE_getAllByType`)
- **Hidden elements** -- Use `{ includeHiddenElements: true }` query option when accessibility-hidden elements are present

## Testing Guide

### Frontend

```bash
./node_modules/.bin/jest --no-coverage --maxWorkers=4
```

### Backend

```bash
cd backend && ./node_modules/.bin/jest --no-coverage
```

### E2E (Playwright)

```bash
npm run build:web
npm run test:e2e
```

### Test Conventions

- Tests assert against i18n keys (e.g., `'dashboard.title'`) not translated strings
- Use `render result` queries (`r.getByText(...)`) instead of `screen` singleton to avoid stale references
- Always `await` `fireEvent.changeText` / `fireEvent.press` calls for state flush
- Add `afterEach(() => jest.restoreAllMocks())` when using `jest.spyOn` to prevent worker leaks

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

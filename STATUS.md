# STATUS

## Session Summary (2026-07-10 — Round 10)

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
  - GroupsScreen: auto-assign rules UI uses English strings (not yet i18n'd)

- **Markdown notes**: `MarkdownText` component for rich-text rendering in miner notes.
  - Supports: **bold**, *italic*, ***bold italic***, `code`, [links](url)
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
- GroupsScreen auto-assign rules UI strings not yet i18n'd (hardcoded English).
- E2E web build: not re-run this session due to disk space constraints.
- CI: Deploy Web fails (missing Vercel secrets), E2E (Playwright) fails (no backend in CI), iOS Build Check fails (no Apple account). All pre-existing infrastructure issues.

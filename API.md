# HashWatch API Reference

## Base URL

```
http://{host}:{port}/api
```

Default: `http://localhost:4000/api`

## Authentication

All authenticated endpoints require a JWT Bearer token in the `Authorization` header:

```
Authorization: Bearer <token>
```

Obtain a token via `POST /auth/register` or `POST /auth/login`. Tokens expire in 30 days. The JWT carries the `userId` and email — there is no dedicated `GET /auth/me` endpoint; decode the token or use `GET /settings` to confirm a session.

## Rate Limits

| Scope                            | Limit                      |
| -------------------------------- | -------------------------- |
| General API                      | 60 requests per minute     |
| Auth endpoints (`/auth`)         | 20 requests per 15 minutes |
| Login (`/auth/login`)            | 5 per minute               |
| Register (`/auth/register`)      | 3 per minute               |
| Push register (`/push/register`) | 5 per minute               |
| Dark pool contributions          | 1 per 5 minutes            |
| Error reporting (`/errors`)      | 10 per minute              |
| Public dashboards (per IP)       | 10 per minute              |

## Error Response Format

```json
{
  "error": "Description of what went wrong"
}
```

Status codes: `400` (validation), `401` (unauthorized), `403` (forbidden), `404` (not found), `409` (conflict), `429` (rate limited), `500` (internal error), `502` (upstream/miner error), `503` (unavailable).

---

## Endpoints

### Health

| Method | Path      | Auth | Description                                                                                       |
| ------ | --------- | ---- | ------------------------------------------------------------------------------------------------- |
| GET    | `/health` | No   | Health check. Returns `{ status, timestamp, db, commitSha }` with `200` (ok) or `503` (degraded). |

### Authentication

| Method | Path             | Auth | Description                                                                                                                                 |
| ------ | ---------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/auth/register` | No   | Register a new account. Body: `{ email, password }` (password min 8 chars). Returns `{ token, userId }`. `409` if the email already exists. |
| POST   | `/auth/login`    | No   | Log in. Body: `{ email, password }`. Returns `{ token, userId }`. `401` on invalid credentials.                                             |

> **Note:** There is no `GET /auth/me` endpoint. Identity comes from the JWT (`Authorization: Bearer <token>`); use `GET /settings` to fetch user-scoped data.

### Settings

| Method | Path             | Auth | Description                                                                                                  |
| ------ | ---------------- | ---- | ------------------------------------------------------------------------------------------------------------ |
| GET    | `/settings`      | Yes  | Get all settings as a key-value map (`{ [key]: string }`).                                                   |
| PUT    | `/settings`      | Yes  | Set a single setting. Body: `{ key, value }` (key ≤ 100 chars, value ≤ 10000 chars). Returns `{ ok: true }`. |
| DELETE | `/settings/:key` | Yes  | Delete a setting. Returns `{ deleted: true }`.                                                               |

### Push Notifications

| Method | Path                    | Auth | Description                                                                                                                                                                   |
| ------ | ----------------------- | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/push/register`        | Yes  | Register a push token. Body: `{ token, alertTypes?, tokenType? }` (`tokenType`: `expo` or `web`, default `expo`). Returns `409` if the token belongs to another user.         |
| DELETE | `/push/unregister`      | Yes  | Unregister a push token. Body: `{ token }`. Returns `404` if the token was not found. Returns `{ ok: true }`.                                                                 |
| POST   | `/push/web-subscribe`   | Yes  | Store a VAPID web push subscription. Body: `{ subscription }` (the full PushSubscription JSON). Replaces any existing subscription for the user. Returns `{ success: true }`. |
| POST   | `/push/web-unsubscribe` | Yes  | Remove the user's web push subscription. Returns `{ success: true }`.                                                                                                         |

### Miners

| Method | Path                             | Auth | Description                                                                                            |
| ------ | -------------------------------- | ---- | ------------------------------------------------------------------------------------------------------ |
| GET    | `/miners`                        | Yes  | List all miners for the authenticated user (newest first).                                             |
| POST   | `/miners`                        | Yes  | Register a miner. Body: `{ name, ip, port? }` (port default 80). Returns `201` with the created miner. |
| PUT    | `/miners/:id`                    | Yes  | Update a miner (partial). Body: `{ name?, ip?, port? }`. Returns `404` if not found.                   |
| DELETE | `/miners/:id`                    | Yes  | Delete a miner. Returns `{ deleted: true }`.                                                           |
| GET    | `/miners/pools`                  | Yes  | List pool statistics for all miners.                                                                   |
| GET    | `/miners/:minerId/notes`         | Yes  | List notes for a miner (newest first).                                                                 |
| POST   | `/miners/:minerId/notes`         | Yes  | Add a note. Body: `{ text }` (1-500 chars). Supports markdown. Returns `201`.                          |
| PUT    | `/miners/:minerId/notes/:noteId` | Yes  | Update a note's text. Body: `{ text }` (1-500 chars).                                                  |
| DELETE | `/miners/:minerId/notes/:noteId` | Yes  | Delete a note. Returns `{ deleted: true }`.                                                            |

> **Note:** There is no `POST /miners/sync` or `GET /miners/:id/stats` endpoint. Stats live on the separate `/stats` router (below).

### Stats (snapshots)

| Method | Path              | Auth | Description                                                                                                                                                                                                                                      |
| ------ | ----------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| GET    | `/stats/:minerId` | Yes  | Get snapshots for a miner. Query: `limit` (default 100, max 1000). Snapshots are scoped to the authenticated user's miners.                                                                                                                      |
| POST   | `/stats/:minerId` | Yes  | Submit a new snapshot. Body: `{ hashRate, temperature, voltage, current, power, sharesAccepted, sharesRejected, uptimeSeconds, frequency }`. Verifies miner ownership. Returns `201` with the snapshot; broadcasts a `snapshot` WebSocket event. |

### Proxy

| Method | Path                    | Auth | Description                                                                                                                                 |
| ------ | ----------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/proxy`                | Yes  | Proxy an HTTP request to a miner. Body: `{ url, method?, headers?, data? }`. Only private miner URLs allowed. Response size limited to 1MB. |
| POST   | `/proxy/restart`        | Yes  | Send restart command to a miner. Body: `{ url }`. Returns `{ success: true }`.                                                              |
| POST   | `/proxy/flash`          | Yes  | Flash firmware (OTA). Body: `{ url, method?, body? }`. Only POST/PUT methods allowed. Returns `{ success, data }`.                          |
| POST   | `/proxy/pool`           | Yes  | Change pool settings on a miner. Body: `{ minerUrl, body }`. Returns `{ success, data }`.                                                   |
| POST   | `/proxy/firmware-check` | Yes  | Check the latest AXeOS release from GitHub. Returns the GitHub release JSON.                                                                |
| POST   | `/proxy/flash-firmware` | Yes  | Flash firmware to a miner by IP. Body: `{ minerIp, firmwareUrl }`. Returns `{ success, data }`.                                             |

### Receipt Validation

| Method | Path                | Auth | Description                                                                                 |
| ------ | ------------------- | ---- | ------------------------------------------------------------------------------------------- |
| POST   | `/receipt/validate` | Yes  | Validate an in-app purchase receipt via RevenueCat. Header: `x-platform` (`ios`/`android`). |

### Notification Preferences

| Method | Path                           | Auth | Description                                                           |
| ------ | ------------------------------ | ---- | --------------------------------------------------------------------- |
| GET    | `/notification-prefs/:minerId` | Yes  | Get notification preferences for a miner (alert type to enabled map). |
| PUT    | `/notification-prefs/:minerId` | Yes  | Update a notification preference. Body: `{ alertType, enabled }`.     |

### Alert Rules

| Method | Path                          | Auth | Description                                                                                                                                             |
| ------ | ----------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/miner-alert-rules/:minerId` | Yes  | Get alert rules for a miner. Returns defaults if none set.                                                                                              |
| PUT    | `/miner-alert-rules/:minerId` | Yes  | Update alert rules. Body: `{ tempThreshold?, hashrateDropPercent?, offlineReminderMinutes?, uptimeThresholdHours?, shareRejectionPercent?, enabled? }`. |

### Alert History

| Method | Path                      | Auth | Description                                                                                    |
| ------ | ------------------------- | ---- | ---------------------------------------------------------------------------------------------- |
| GET    | `/alert-history`          | Yes  | List alert history (newest first). Query: `limit` (default 50, max 200), `offset` (default 0). |
| POST   | `/alert-history/sync`     | Yes  | Sync alerts to the server. Body: `{ alerts }`.                                                 |
| PUT    | `/alert-history/:id/read` | Yes  | Mark an alert as read.                                                                         |

### Notification History

| Method | Path                         | Auth | Description                                                                                           |
| ------ | ---------------------------- | ---- | ----------------------------------------------------------------------------------------------------- |
| GET    | `/notification-history`      | Yes  | List notification history (newest first). Query: `limit` (default 50, max 200), `offset` (default 0). |
| POST   | `/notification-history/sync` | Yes  | Sync notification history to the server.                                                              |
| DELETE | `/notification-history`      | Yes  | Clear all notification history. Returns `{ deleted: true }`.                                          |

### Pool Changes

| Method | Path                     | Auth | Description                                                          |
| ------ | ------------------------ | ---- | -------------------------------------------------------------------- |
| GET    | `/pool-changes/:minerId` | Yes  | List pool changes for a miner. Query: `limit` (default 20, max 100). |
| POST   | `/pool-changes`          | Yes  | Record a pool change. Body: `{ minerId, newPool, oldPool? }`.        |

### Pool Analytics

| Method | Path                     | Auth | Description                                  |
| ------ | ------------------------ | ---- | -------------------------------------------- |
| GET    | `/pool-analytics/config` | Yes  | Get pool analytics API config (keys masked). |
| POST   | `/pool-analytics/config` | Yes  | Save pool analytics API config.              |
| GET    | `/pool-analytics`        | Yes  | Fetch pool analytics stats.                  |

### Webhooks

| Method | Path             | Auth | Description                                                                                                                                   |
| ------ | ---------------- | ---- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/webhooks/logs` | Yes  | List webhook delivery logs (paginated). Query: `limit` (default 50, max 200), `offset` (default 0). Returns `{ logs, total, limit, offset }`. |
| DELETE | `/webhooks/logs` | Yes  | Clear all webhook logs. Returns `{ deleted: true }`.                                                                                          |

### Groups

| Method | Path           | Auth | Description                                                                                               |
| ------ | -------------- | ---- | --------------------------------------------------------------------------------------------------------- |
| GET    | `/groups`      | Yes  | List the user's miner groups (ordered by `sort_order`). Returns `{ groups: [...] }`.                      |
| POST   | `/groups/sync` | Yes  | Upsert a batch of groups. Body: `{ groups: [{ name, minerIds?, order? }] }`. Returns `{ success: true }`. |

> **Note:** There is no `POST /groups` create endpoint — group creation happens via `POST /groups/sync` (upsert by name).

### Group Sharing

| Method | Path                             | Auth | Description                                                                                   |
| ------ | -------------------------------- | ---- | --------------------------------------------------------------------------------------------- |
| GET    | `/groups/share`                  | Yes  | List groups shared with the authenticated user.                                               |
| POST   | `/groups/share`                  | Yes  | Share a group with another user. Body: `{ groupId, email, accessLevel }`.                     |
| GET    | `/groups/shared-by-me`           | Yes  | List groups shared by the authenticated user.                                                 |
| PUT    | `/groups/share/:id`              | Yes  | Update group share access level (`view`/`edit`).                                              |
| DELETE | `/groups/share/:id`              | Yes  | Revoke a group share.                                                                         |
| GET    | `/groups/shared-miners/:groupId` | Yes  | Get miners shared with the authenticated user for a group. Returns `{ miners, accessLevel }`. |

### Custom Themes

| Method | Path                 | Auth | Description                                                                                |
| ------ | -------------------- | ---- | ------------------------------------------------------------------------------------------ |
| GET    | `/custom-themes`     | Yes  | List all custom themes for the authenticated user.                                         |
| GET    | `/custom-themes/:id` | Yes  | Get a specific custom theme.                                                               |
| POST   | `/custom-themes`     | Yes  | Create a custom theme. Body: `{ name?, colors }`. Max 20 themes per user. Colors max 50KB. |
| PUT    | `/custom-themes/:id` | Yes  | Update a custom theme. Body: `{ name?, colors? }`.                                         |
| DELETE | `/custom-themes/:id` | Yes  | Delete a custom theme.                                                                     |

### Dark Pool

| Method | Path                         | Auth | Description                                                                                                                                                                                         |
| ------ | ---------------------------- | ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/darkpool/contribute`       | Yes  | Contribute hashrate data. Body: `{ hashrate, power, temp?, poolName?, region? }`. Rate limited to 1 per 5 minutes. Returns `201` with `{ ok: true, id }`.                                           |
| GET    | `/darkpool/aggregate`        | Yes  | Get aggregate dark pool stats. Query: `period` (`1h`, `24h`, `7d`, `30d`; default `24h`). Returns `{ totalHashrate, avgPower, avgTemp, contributorCount, poolBreakdown, regionBreakdown, period }`. |
| GET    | `/darkpool/my-contributions` | Yes  | List the authenticated user's contributions (last 100).                                                                                                                                             |
| DELETE | `/darkpool/my-contributions` | Yes  | Delete all of the authenticated user's contributions. Returns `{ ok: true, deleted }`.                                                                                                              |

### Error Reporting

| Method | Path      | Auth | Description                                                                                                                                                                                                                                                 |
| ------ | --------- | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/errors` | Yes  | Send a batch of client errors/events. Body: `{ errors?: [{ message, stack?, context?, timestamp?, platform? }], events?: [{ name, properties?, timestamp?, platform? }], appVersion? }`. Max 100 errors and 100 events per request. Returns `{ received }`. |

### Public Dashboards

| Method | Path                        | Auth | Description                                                                                                                          |
| ------ | --------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------ |
| POST   | `/public-dashboards`        | Yes  | Create a share token for a miner. Body: `{ minerId }`. Returns existing token if one exists, else `201` with `{ token, createdAt }`. |
| GET    | `/public-dashboards/:token` | No   | Fetch a public dashboard by token (rate limited per IP). Returns `{ minerName, minerId, snapshot, createdAt }`.                      |
| DELETE | `/public-dashboards/:token` | Yes  | Revoke a share token (must own it). Returns `{ deleted: true }`.                                                                     |

### Marketplace

| Method | Path                | Auth | Description                                                                                                                                                    |
| ------ | ------------------- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/marketplace`      | No   | List active listings (public). Query: `page` (default 1), `limit` (default 20, max 20). Returns `{ listings, total, page, limit }`. Seller IDs are anonymized. |
| GET    | `/marketplace/mine` | Yes  | List the authenticated user's own listings.                                                                                                                    |
| POST   | `/marketplace`      | Yes  | Create a listing. Body: `{ title, description, price, currency, model, condition, location }` (`condition` in `like_new`/`good`/`fair`). Returns `201`.        |
| DELETE | `/marketplace/:id`  | Yes  | Delete the authenticated user's own listing. Returns `{ deleted: true }`.                                                                                      |

### Teams

| Method | Path                | Auth | Description                                                                                       |
| ------ | ------------------- | ---- | ------------------------------------------------------------------------------------------------- |
| POST   | `/teams`            | Yes  | Create a team. Body: `{ name }` (≤ 50 chars). Returns `201` with `{ team, membership }`.          |
| GET    | `/teams`            | Yes  | List the user's teams and pending invitations. Returns `{ teams, invitations }`.                  |
| POST   | `/teams/:id/invite` | Yes  | Invite a member by email. Body: `{ email, role }` (`role` in `viewer`/`admin`). Owner/admin only. |
| POST   | `/teams/:id/accept` | Yes  | Accept a pending invitation.                                                                      |
| GET    | `/teams/:id/miners` | Yes  | List miners visible to the team (member only).                                                    |
| DELETE | `/teams/:id/leave`  | Yes  | Leave a team (owners cannot leave).                                                               |

### Alert Channels (SMS/Telegram)

| Method | Path                       | Auth | Description                                                                                                                                                                        |
| ------ | -------------------------- | ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/alert-channels`          | Yes  | Register a channel. Body: `{ type, config }` (`type` in `sms`/`telegram`; SMS requires `config.phoneNumber`, Telegram requires `config.chatId`). Returns `201` with `{ channel }`. |
| GET    | `/alert-channels`          | Yes  | List the user's channels. Returns `{ channels: [...] }`.                                                                                                                           |
| DELETE | `/alert-channels/:id`      | Yes  | Remove a channel. Returns `{ ok: true }`.                                                                                                                                          |
| POST   | `/alert-channels/:id/test` | Yes  | Send a test notification through the channel. Returns `{ ok: true, message }`.                                                                                                     |

### Bot Channels (Discord/Telegram webhooks)

| Method | Path                     | Auth | Description                                                                                                                    |
| ------ | ------------------------ | ---- | ------------------------------------------------------------------------------------------------------------------------------ |
| POST   | `/bot-channels`          | Yes  | Register a bot webhook. Body: `{ type, webhookUrl, name }` (`type` in `discord`/`telegram`). Returns `201` with `{ channel }`. |
| GET    | `/bot-channels`          | Yes  | List the user's bot channels. Returns `{ channels: [...] }`.                                                                   |
| DELETE | `/bot-channels/:id`      | Yes  | Remove a bot channel. Returns `{ ok: true }`.                                                                                  |
| POST   | `/bot-channels/:id/test` | Yes  | Send a test alert. Returns `{ ok: true, message }`.                                                                            |

### Stripe

| Method | Path                              | Auth | Description                                                                                                               |
| ------ | --------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/stripe/create-checkout-session` | Yes  | Create a Stripe checkout session. Body: `{ priceId, trialPeriodDays? }`. Returns `{ url }`. Requires `STRIPE_SECRET_KEY`. |
| GET    | `/stripe/subscription`            | Yes  | Get the user's subscription status. Returns `{ active, inTrial, trialEndsAt?, platform?, productId?, expiresAt? }`.       |
| POST   | `/stripe/webhook`                 | No   | Stripe webhook endpoint (raw body, HMAC-signed with `STRIPE_WEBHOOK_SECRET`). Returns `{ received: true }`.               |

---

## WebSocket

A WebSocket server runs at `ws://{host}:{port}/ws` (same origin as the REST API).

### Client → Server

| Message                          | Description                                            |
| -------------------------------- | ------------------------------------------------------ |
| `{ type: 'auth', token }`        | Authenticate with a JWT (must be sent within 30s).     |
| `{ type: 'pong' }`               | Heartbeat reply to server pings.                       |
| `{ type: 'subscribe', minerId }` | Subscribe to updates for a miner (ownership verified). |

### Server → Client

| Message                           | Description                                              |
| --------------------------------- | -------------------------------------------------------- |
| `{ type: 'auth_ok' }`             | Authentication accepted.                                 |
| `{ type: 'auth_error', message }` | Authentication failed or timed out.                      |
| `{ type: 'subscribed', minerId }` | Subscription confirmed.                                  |
| `{ type: 'snapshot', snapshot }`  | A new miner snapshot was submitted (broadcast to owner). |
| `{ type: 'error', message }`      | Invalid message, missing auth, or miner not found.       |

Server pings clients every 30s (`HEARTBEAT_INTERVAL`); clients must answer with `pong` or they are terminated. When the socket is active, client polling intervals extend to 5 minutes (30-second fallback when disconnected).

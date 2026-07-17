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

Obtain a token via `/auth/register` or `/auth/login`. Tokens expire in 30 days.

## Rate Limits

| Scope                   | Limit                      |
| ----------------------- | -------------------------- |
| General                 | 60 requests per minute     |
| Auth endpoints          | 20 requests per 15 minutes |
| Dark pool contributions | 1 per 5 minutes            |

## Error Response Format

```json
{
  "error": "Description of what went wrong"
}
```

Status codes: `400` (validation), `401` (unauthorized), `404` (not found), `409` (conflict), `429` (rate limited), `500` (internal error).

---

## Endpoints

### Health

| Method | Path      | Auth | Description                           |
| ------ | --------- | ---- | ------------------------------------- |
| GET    | `/health` | No   | Health check (returns `200` or `503`) |

### Authentication

| Method | Path             | Auth | Description                                                                                              |
| ------ | ---------------- | ---- | -------------------------------------------------------------------------------------------------------- |
| POST   | `/auth/register` | No   | Register a new account. Body: `{ email, password }` (password min 8 chars). Returns `{ token, userId }`. |
| POST   | `/auth/login`    | No   | Log in. Body: `{ email, password }`. Returns `{ token, userId }`.                                        |

### Miners

| Method | Path            | Auth | Description                                              |
| ------ | --------------- | ---- | -------------------------------------------------------- |
| GET    | `/miners`       | Yes  | List all miners for the authenticated user.              |
| POST   | `/miners`       | Yes  | Register a miner. Body: `{ name, ip, port? }`.           |
| PUT    | `/miners/:id`   | Yes  | Update a miner (partial). Body: `{ name?, ip?, port? }`. |
| DELETE | `/miners/:id`   | Yes  | Delete a miner.                                          |
| GET    | `/miners/pools` | Yes  | List pool statistics for all miners.                     |

### Miner Notes

| Method | Path                             | Auth | Description                                                    |
| ------ | -------------------------------- | ---- | -------------------------------------------------------------- |
| GET    | `/miners/:minerId/notes`         | Yes  | List notes for a miner (newest first).                         |
| POST   | `/miners/:minerId/notes`         | Yes  | Add a note. Body: `{ text }` (1-500 chars). Supports markdown. |
| PUT    | `/miners/:minerId/notes/:noteId` | Yes  | Update a note's text.                                          |
| DELETE | `/miners/:minerId/notes/:noteId` | Yes  | Delete a note.                                                 |

### Stats

| Method | Path              | Auth | Description                                                                                                                                  |
| ------ | ----------------- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/stats/:minerId` | Yes  | Get snapshots for a miner. Query: `limit` (default 100, max 1000).                                                                           |
| POST   | `/stats/:minerId` | Yes  | Submit a new snapshot. Body: `{ hashrate, temperature, voltage, current, power, sharesAccepted, sharesRejected, uptimeSeconds, frequency }`. |

### Proxy

| Method | Path                    | Auth | Description                                                                                      |
| ------ | ----------------------- | ---- | ------------------------------------------------------------------------------------------------ |
| POST   | `/proxy`                | Yes  | Proxy an HTTP request to a miner. Body: `{ url, method?, body? }`. Response size limited to 1MB. |
| POST   | `/proxy/restart`        | Yes  | Send restart command to a miner. Body: `{ url }`.                                                |
| POST   | `/proxy/flash`          | Yes  | Flash firmware (OTA). Body: `{ url, method?, body? }`. Only POST/PUT methods allowed.            |
| POST   | `/proxy/pool`           | Yes  | Change pool settings on a miner. Body: `{ minerUrl, body }`.                                     |
| POST   | `/proxy/flash-firmware` | Yes  | Flash firmware to a miner by IP. Body: `{ minerIp, firmwareUrl }`.                               |

### Push Notifications

| Method | Path               | Auth | Description                                                                                            |
| ------ | ------------------ | ---- | ------------------------------------------------------------------------------------------------------ |
| POST   | `/push/register`   | Yes  | Register a push notification token. Body: `{ token }`. Returns `409` if token belongs to another user. |
| DELETE | `/push/unregister` | Yes  | Unregister a push notification token. Body: `{ token }`.                                               |

### Settings

| Method | Path             | Auth | Description                            |
| ------ | ---------------- | ---- | -------------------------------------- |
| GET    | `/settings`      | Yes  | Get all settings as a key-value map.   |
| PUT    | `/settings`      | Yes  | Set a setting. Body: `{ key, value }`. |
| DELETE | `/settings/:key` | Yes  | Delete a setting.                      |

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
| DELETE | `/notification-history`      | Yes  | Clear all notification history.                                                                       |
| POST   | `/notification-history/sync` | Yes  | Sync notification history to the server.                                                              |

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

| Method | Path             | Auth | Description                                                                                         |
| ------ | ---------------- | ---- | --------------------------------------------------------------------------------------------------- |
| GET    | `/webhooks/logs` | Yes  | List webhook delivery logs (paginated). Query: `limit` (default 50, max 200), `offset` (default 0). |
| DELETE | `/webhooks/logs` | Yes  | Clear all webhook logs.                                                                             |

### Group Sharing

| Method | Path                    | Auth | Description                                                               |
| ------ | ----------------------- | ---- | ------------------------------------------------------------------------- |
| GET    | `/groups`               | Yes  | List shared groups.                                                       |
| POST   | `/groups/share`         | Yes  | Share a group with another user. Body: `{ groupId, email, accessLevel }`. |
| PUT    | `/groups/:id`           | Yes  | Update group share access level (`view`/`edit`).                          |
| DELETE | `/groups/:id`           | Yes  | Revoke a group share.                                                     |
| GET    | `/groups/shared-miners` | Yes  | Get miners shared with the authenticated user.                            |

### Custom Themes

| Method | Path                 | Auth | Description                                                                                |
| ------ | -------------------- | ---- | ------------------------------------------------------------------------------------------ |
| GET    | `/custom-themes`     | Yes  | List all custom themes for the authenticated user.                                         |
| GET    | `/custom-themes/:id` | Yes  | Get a specific custom theme.                                                               |
| POST   | `/custom-themes`     | Yes  | Create a custom theme. Body: `{ name?, colors }`. Max 20 themes per user. Colors max 50KB. |
| PUT    | `/custom-themes/:id` | Yes  | Update a custom theme. Body: `{ name?, colors? }`.                                         |
| DELETE | `/custom-themes/:id` | Yes  | Delete a custom theme.                                                                     |

### Dark Pool

| Method | Path                         | Auth | Description                                                                                                        |
| ------ | ---------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------ |
| POST   | `/darkpool/contribute`       | Yes  | Contribute hashrate data. Body: `{ hashrate, power, temp?, poolName?, region? }`. Rate limited to 1 per 5 minutes. |
| GET    | `/darkpool/aggregate`        | Yes  | Get aggregate dark pool stats. Query: `period` (`1h`, `24h`, `7d`, `30d`; default `24h`).                          |
| GET    | `/darkpool/my-contributions` | Yes  | List the authenticated user's contributions (last 100).                                                            |
| DELETE | `/darkpool/my-contributions` | Yes  | Delete all of the authenticated user's contributions.                                                              |

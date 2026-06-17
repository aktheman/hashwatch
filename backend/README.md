# HashWatch API

Backend server for the HashWatch Bitaxe miner monitoring app. Provides authentication, remote miner sync, stats aggregation, push notifications, WebSocket live updates, and a proxy for web clients.

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express
- **Database:** PostgreSQL
- **Auth:** bcryptjs + JWT
- **Realtime:** WebSocket (ws)
- **Push:** expo-server-sdk
- **Validation:** zod
- **Rate Limiting:** express-rate-limit

## API Routes

> A full OpenAPI 3.0 specification is available at [openapi.json](openapi.json) with request/response schemas.

| Route                                  | Description                                  |
| -------------------------------------- | -------------------------------------------- |
| `POST /api/auth/register`              | Create account                               |
| `POST /api/auth/login`                 | Sign in                                      |
| `GET /api/miners`                      | List user's miners                           |
| `POST /api/miners`                     | Add a miner                                  |
| `DELETE /api/miners/:id`               | Remove a miner                               |
| `PUT /api/miners/:id`                  | Update a miner                               |
| `POST /api/stats/:minerId`             | Push a snapshot                              |
| `GET /api/stats/:minerId`              | Get snapshot history                         |
| `POST /api/proxy`                      | Proxy HTTP requests to miners (for web)      |
| `POST /api/push/register`              | Register push token                          |
| `GET /api/settings`                    | Get user settings                            |
| `PUT /api/settings`                    | Update a setting                             |
| `GET /api/notification-prefs/:minerId` | Get notification preferences                 |
| `PUT /api/notification-prefs/:minerId` | Update notification preferences              |
| `POST /api/receipt/validate`           | Validate RevenueCat receipt                  |
| `GET /api/health`                      | Health check                                 |
| `WS /ws`                               | WebSocket endpoint for live snapshot updates |

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+

### Setup

```bash
cd backend
cp .env.example .env
npm install
npm run db:init
npm run dev
```

### Environment Variables

| Variable              | Description                                 |
| --------------------- | ------------------------------------------- |
| `PORT`                | Server port (default: 4000)                 |
| `DATABASE_URL`        | Full PostgreSQL connection string           |
| `DB_HOST`             | Database host (fallback if no DATABASE_URL) |
| `DB_PORT`             | Database port                               |
| `DB_NAME`             | Database name                               |
| `DB_USER`             | Database user                               |
| `DB_PASSWORD`         | Database password                           |
| `JWT_SECRET`          | Secret for signing auth tokens              |
| `REVENUECAT_API_KEY`  | RevenueCat API key for receipt validation   |
| `EXPO_PUBLIC_API_URL` | Public API URL for CORS                     |

## WebSocket Protocol

After authenticating via REST auth, connect to `/ws` with a JSON auth message:

```json
{ "type": "auth", "token": "<jwt-token>" }
```

The server streams `snapshot` messages when miner data is pushed from the app.

## Deployment

The API is configured for deployment on [Railway](https://railway.app) via Nixpacks:

```bash
railway up
```

Or deploy manually:

```bash
npm run build
node dist/index.js
```

## API Documentation

An OpenAPI 3.0 specification is available at [openapi.json](openapi.json). View it in any OpenAPI-compatible tool (Swagger UI, Stoplight, etc.):

```bash
# Serve with Swagger UI via npx
npx swagger-ui-cli openapi.json
```

## Testing

```bash
npm test
```

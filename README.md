# ZCS — Zodetron Cloud Services

ZCS is a full-stack, multi-tenant cloud object storage platform built as a submission for **Zoho SETU**. Think of it as a self-hosted AWS S3 — tenants sign up, create buckets, upload and download files, manage API keys, and get usage-based billing. An admin console lets the platform operator manage all tenants, pricing, rate limits, and view real-time infrastructure health.

The project is production-deployed on [Render](https://zcs-bfm3.onrender.com) and a separate marketing landing page lives at the ZCS-Landing repo.

---

## What It Does

**For tenants (customers):**
- Sign up and get a storage account with a free tier
- Create named buckets and upload files up to 100 MB via the dashboard or API
- Download files, manage objects, delete buckets
- Create and revoke API keys for programmatic access
- See real-time usage (storage, bandwidth, request count) and cost breakdown
- View billing estimates and invoice history
- Analytics page with 6-month usage history charts and an in-browser ML model that predicts end-of-month usage and estimated cost

**For admins:**
- View all tenants, their usage, plans, and status
- Suspend or activate tenants, change their plan
- Set global pricing rules or per-tenant overrides
- Configure rate limits globally or per-tenant
- View live infrastructure health (CPU, RAM, service latencies)
- Detect abnormal usage spikes (abuse detection)
- Full audit log of every platform action

---

## Credentials

| Role | Email | Password |
|---|---|---|
| Admin | `admin@storagecloud.io` | `admin123` |
| Demo tenant | `demo@example.com` | `demo123` |

---

## Repository Structure

```
ZCS/
├── frontend/          Next.js 15 dashboard + marketing docs page
├── backend/           Fastify API server
│   ├── src/
│   │   ├── auth/      Login, register, API key auth
│   │   ├── storage/   Buckets, objects, upload, download, presign
│   │   ├── billing/   Cost estimates, invoices
│   │   ├── metering/  Usage summary, history, events
│   │   ├── admin/     Admin-only routes (tenants, pricing, rate limits, etc.)
│   │   └── shared/    Prisma client, Redis client, MinIO client, cache, errors
│   └── prisma/        Schema + seed
├── Dockerfile         Multi-stage build (frontend + backend + nginx in one image)
├── docker-compose.yml Local dev setup
├── nginx-app.conf     Nginx reverse proxy config (template)
├── supervisord.conf   Process manager config (runs 3 processes in one container)
├── entrypoint.sh      Container startup script
├── PRICING.md         Detailed pricing reference
└── README.md          This file
```

---

## Architecture & How Everything Works

A complete reference for how the platform is built, how data flows, how Docker runs it, and how pricing is computed. Everything below is derived from the actual source code.

---

## Table of Contents

1. [High-Level Overview](#1-high-level-overview)
2. [Technology Stack](#2-technology-stack)
3. [How Docker Works in This Project](#3-how-docker-works-in-this-project)
4. [Request Flow — What Happens When a User Does Anything](#4-request-flow)
5. [Authentication & API Keys](#5-authentication--api-keys)
6. [Storage — How Files Are Saved](#6-storage--how-files-are-saved)
7. [Usage Tracking — How the System Knows What You Used](#7-usage-tracking)
8. [Rate Limiting — How Redis Is Used](#8-rate-limiting)
9. [Pricing & Billing — How Costs Are Calculated](#9-pricing--billing)
10. [Admin System](#10-admin-system)
11. [ML Prediction](#11-ml-prediction)
12. [Caching Strategy](#12-caching-strategy)
13. [Infrastructure Stats — Where CPU/RAM Numbers Come From](#13-infrastructure-stats)
14. [Data Storage Map — What Lives Where](#14-data-storage-map)

---

## 1. High-Level Overview

```
Browser / API Client
        │
        ▼
   Nginx (port 10000 on Render / port 80 locally)
        │
        ├── /api/* ──────────► Fastify backend  (port 4000)
        │                            │
        │                       ┌────┴────────────────────┐
        │                       │                         │
        │                  PostgreSQL              MinIO / S3
        │                  (Neon cloud)          (actual file storage)
        │                       │
        │                     Redis
        │                  (Upstash cloud)
        │
        └── /*  ──────────► Next.js frontend (port 3000)
```

ZCS is a multi-tenant cloud storage platform — like AWS S3, but self-hosted. Each customer (tenant) gets their own buckets, objects, API keys, usage tracking, and billing.

---

## 2. Technology Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | Next.js 15 (App Router) | Server-side rendering, React, file-based routing |
| Backend | Fastify (Node.js) | Fast, low-overhead HTTP framework |
| Database | PostgreSQL (Neon cloud) | All structured data — tenants, usage, billing, objects |
| File Storage | MinIO (S3-compatible) | Actual binary file storage, not in Postgres |
| Cache / Rate Limit | Redis (Upstash cloud) | Rate limit counters + hot-path query cache |
| Reverse Proxy | Nginx | Routes traffic between frontend and backend in one container |
| Process Manager | Supervisord | Runs backend + frontend + nginx in a single container |
| ORM | Prisma | Type-safe database queries |
| Auth | JWT (jsonwebtoken) | Stateless token auth |
| ML | TensorFlow.js | In-browser usage prediction on Analytics page |
| Container | Docker (multi-stage build) | Single deployable image for frontend + backend |

---

## 3. How Docker Works in This Project

### Local dev (`docker-compose.yml`)

Three containers:

```
┌─────────────────────┐  ┌─────────────────┐  ┌──────────────────────────┐
│   postgres:16       │  │   redis:7        │  │   app (Dockerfile)       │
│   port 5432         │  │   port 6379      │  │   port 3000 → 80         │
│   volume: pg_data   │  │   volume: rd_data│  │   (frontend + backend)   │
└─────────────────────┘  └─────────────────┘  └──────────────────────────┘
```

The `app` container depends on `redis` being healthy before it starts. Postgres is listed separately so the app connects to it via `DATABASE_URL`.

### Production (`Dockerfile` — multi-stage build)

The root `Dockerfile` builds a **single self-contained image** that runs everything:

**Stage 1 — Build the frontend:**
```dockerfile
FROM node:20-alpine AS frontend-builder
# Install deps, copy frontend/, run `npm run build`
# Next.js outputs a standalone bundle to .next/standalone/
```

**Stage 2 — Assemble the final image:**
```dockerfile
FROM node:20-alpine
RUN apk add --no-cache nginx supervisor openssl gettext

# Backend code (Fastify, Prisma)
COPY backend/ .
RUN npx prisma generate

# Frontend standalone bundle from Stage 1
COPY --from=frontend-builder /frontend/.next/standalone ./frontend/
COPY --from=frontend-builder /frontend/.next/static     ./frontend/.next/static/
COPY --from=frontend-builder /frontend/public           ./frontend/public/

# Nginx config template + supervisord config
COPY nginx-app.conf /etc/nginx/nginx.conf.template
COPY supervisord.conf /etc/supervisord.conf

EXPOSE 10000   # Render expects this port
ENTRYPOINT ["/entrypoint.sh"]
```

### What `entrypoint.sh` does on container start

Every time the container boots, this script runs in order:

```
1. Wait for PostgreSQL to accept connections
   (retries `prisma db push` until it succeeds)

2. Apply schema changes
   npx prisma db push --skip-generate --accept-data-loss

3. Seed the database
   node prisma/seed.js
   (creates default admin, demo tenant, pricing rules, sample audit logs)

4. Substitute ${PORT} into the nginx config template
   envsubst '${PORT}' < nginx-app.conf.template > nginx.conf

5. Start supervisord
   which starts backend (port 4000), frontend (port 3000), and nginx (port 10000)
   all three processes run in the same container, supervised and auto-restarted
```

### How Nginx routes traffic inside the container

```
Incoming request on port 10000
        │
        ├── URL starts with /api/  ──► http://127.0.0.1:4000  (Fastify)
        │                               max body: 5 GB
        │                               timeout: 300s
        │
        └── Everything else        ──► http://127.0.0.1:3000  (Next.js)
                                        WebSocket upgrade supported
```

This is why the frontend calls `/api/...` without a hostname — in production, Nginx intercepts it and proxies to the backend on the same machine. In local dev without Docker, `next.config.mjs` has an identical rewrite rule that does the same thing.

### Supervisord — keeping three processes alive

`supervisord.conf` manages three programs inside the single container:

| Program | Command | Priority | Restarts? |
|---|---|---|---|
| `backend` | `node /app/src/index.js` | 10 (starts first) | yes |
| `frontend` | `node /app/frontend/server.js` | 20 | yes |
| `nginx` | `nginx -g "daemon off;"` | 30 (starts last) | yes |

If any process crashes, supervisord restarts it automatically. All logs go to stdout/stderr so Render's log viewer captures them.

---

## 4. Request Flow

### A tenant uploads a file

```
1. Browser sends POST /api/storage/buckets/my-bucket/upload-file
   with Authorization: Bearer <jwt>

2. Nginx receives it on port 10000, matches /api/, proxies to port 4000

3. Fastify receives the request

4. preHandler hook 1: authenticateApiKey()
   → reads Authorization header → verifies JWT → sets req.tenantId

5. preHandler hook 2: rateLimitMiddleware()
   → Redis INCR "rl:tenant:<id>" with TTL
   → if over limit → 429, stop here

6. Route handler: POST /buckets/:name/upload-file
   a. Look up bucket in Postgres → confirm it belongs to this tenant
   b. Stream multipart body into a Buffer (all bytes collected in memory)
   c. PUT buffer into MinIO → file physically stored
   d. Upsert Object row in Postgres (key, size, contentType, storageKey)
   e. Create UsageEvent row in Postgres (eventType='upload', bytes=N)
   f. Return 201 with { object, bytes, cost }

7. Nginx sends response back to browser
```

### What happens on a network disconnect mid-upload

The `for await (chunk of data.file)` loop throws when the connection drops. Steps c, d, and e never run. No file in MinIO. No Object row. No UsageEvent. **No charge.**

---

## 5. Authentication & API Keys

### JWT (browser dashboard users)

On login, the backend signs a JWT:
```js
jwt.sign(
  { tenantId, email, role },   // or { adminId, role: 'platform_admin' } for admin
  config.jwt.secret,
  { expiresIn: '7d' }
)
```

The frontend stores this in `localStorage` and sends it as `Authorization: Bearer <token>` on every request. The `authenticate` middleware verifies it and sets `req.tenantId`.

### API Keys (programmatic access)

Tenants can create API keys in the dashboard. The key is stored as a SHA-256 hash in Postgres — the plaintext is shown once and never stored. On each request with `X-Api-Key: <key>`, the middleware hashes the incoming key and looks it up:

```
X-Api-Key header present?
  yes → hash it → find ApiKey row → set req.tenantId from key.tenantId
  no  → fall through to JWT Bearer check
```

---

## 6. Storage — How Files Are Saved

Files are **never stored in PostgreSQL**. The flow is:

```
Browser → Backend (Fastify) → MinIO
                 ↓
           Postgres Object row
           (metadata only: key, size, contentType, storageKey)
```

**MinIO** is an S3-compatible object store. Every tenant's files live under a path like:
```
<tenantId>/<bucketId>/<objectKey>
```

All files for all tenants share one MinIO bucket (`storagecloud` by default). The `tenantId` prefix is the isolation boundary.

**Three upload paths:**

| Route | How it works |
|---|---|
| `POST /buckets/:name/upload` | Body is JSON/text, buffered and PUT to MinIO |
| `POST /buckets/:name/upload-file` | Multipart form, streamed into buffer, PUT to MinIO |
| `POST /presign/upload` + `POST /confirm` | Returns a presigned MinIO URL; client uploads directly to MinIO; client calls /confirm to register the object |

**Downloads** go back through the backend (not directly from MinIO), so the backend can log the download event and charge egress.

---

## 7. Usage Tracking

### The `UsageEvent` table — every action leaves a row

```
usageEvent {
  id         String
  tenantId   String    ← which tenant
  apiKeyId   String?   ← which API key (if any)
  eventType  String    ← "upload", "download", "list_objects", etc.
  bytes      BigInt    ← 0 for non-data operations
  bucketName String?
  objectKey  String?
  createdAt  DateTime
}
```

Every API call creates one row. 10 API calls = 10 rows.

### The `Object` table — current storage snapshot

```
object {
  tenantId   String
  bucketId   String
  key        String    ← "my-file.pdf"
  size       BigInt    ← file size in bytes
  storageKey String    ← MinIO path
}
```

This is the live inventory. Upload → row appears. Delete → row disappears. Current storage = `SUM(size)` over all rows for a tenant.

### The `UsageAggregate` table — monthly history

Pre-rolled monthly totals, one row per tenant per month. Used by the Analytics page history charts. Not auto-populated — needs a monthly rollup job to be wired up.

---

## 8. Rate Limiting

Redis is used **only** for rate limiting. Nothing else uses Redis for data storage.

### How it works

Every authenticated request runs `rateLimitMiddleware` before the route handler:

```
1. Read tenant's limits from cache: Redis key "rl:config:<tenantId>"
   If not cached → query Postgres → cache for 5 minutes

2. Redis MULTI:
   INCR "rl:tenant:<tenantId>"   ← atomic increment
   EXPIRE key <window_seconds>   ← auto-reset after window
   EXEC

3. If count > max → return 429
   If count ≤ max → set X-RateLimit-* response headers, continue

4. Rate limit counter resets automatically when the Redis key TTL expires
```

Default limits: 1,000 requests per 60 seconds. Admins can override per-tenant.

The tenant's rate limit config lives in Postgres. Redis only holds the counter. If Redis is unavailable, `rateLimitMiddleware` silently passes all requests through (fail open).

---

## 9. Pricing & Billing

### What costs money

| Metric | Free Tier | Rate |
|---|---|---|
| Storage (data at rest) | 5 GB | $50 / GB / month |
| Upload bandwidth | none | $30 / GB |
| Egress (downloads) | 1 GB / month | $20 / GB |
| API Requests | 10,000 / month | $0.50 / request ($500 / 1k) |

### How costs are calculated

`billing/routes.js` runs four Postgres queries on `GET /api/billing/estimate`:

```js
// 1. How many rows in usageEvent this month? → request count
prisma.usageEvent.count({ where: { tenantId, createdAt: { gte: startOfMonth } } })

// 2. Sum of bytes where eventType = 'upload' → upload GB
prisma.usageEvent.aggregate({
  where: { tenantId, eventType: 'upload', createdAt: { gte: startOfMonth } },
  _sum: { bytes: true }
})

// 3. Sum of bytes where eventType = 'download' → egress GB
prisma.usageEvent.aggregate({
  where: { tenantId, eventType: 'download', createdAt: { gte: startOfMonth } },
  _sum: { bytes: true }
})

// 4. Sum of all object sizes right now → storage GB (live, not event-based)
prisma.object.aggregate({ where: { tenantId }, _sum: { size: true } })
```

Then applies the formula:
```js
const storageCost  = Math.max(0, storageGb  - 5) * 50;
const uploadCost   = uploadGb                     * 30;
const downloadCost = Math.max(0, downloadGb - 1)  * 20;
const requestCost  = Math.max(0, requests - 10000) / 1000 * 500;

total = storageCost + uploadCost + downloadCost + requestCost;
```

Result is cached in Redis for 2 minutes so rapid page refreshes don't hammer the database.

### Invoices

The `Invoice` table exists and is readable via `GET /api/billing/invoices`. There is no automated job that generates invoices at month end — that step needs a cron trigger.

### Per-tenant pricing overrides

Admins can set a `pricingOverride` JSON blob on any tenant. The field is stored but the billing estimate does not yet read it — it always uses global rates.

---

## 10. Admin System

Admins authenticate through the same login page. The backend's `/api/auth/login` endpoint checks the `Tenant` table first, then falls back to the `Admin` table. Admin JWTs contain `role: 'platform_admin'` and no `tenantId`.

All admin API routes are under `/api/admin/*` and run `authenticateAdmin` middleware, which rejects any token where `payload.role !== 'platform_admin'`.

### What admins can do

| Feature | Route | What it does |
|---|---|---|
| View all tenants | `GET /api/admin/tenants` | Paginated list with bucket/key/event counts |
| Suspend / activate tenant | `PATCH /api/admin/tenants/:id/status` | Changes `status` field, writes audit log |
| Change tenant plan | `PATCH /api/admin/tenants/:id/plan` | Writes audit log |
| Global pricing | `PUT /api/admin/pricing/global` | Updates `PricingRule` table |
| Per-tenant pricing override | `PATCH /api/admin/pricing/tenant/:id` | Sets `pricingOverride` JSON on tenant |
| Rate limit defaults | `PUT /api/admin/rate-limits/defaults` | Stores in Redis + updates all matching tenants in Postgres |
| Per-tenant rate limits | `PATCH /api/admin/rate-limits/:tenantId` | Updates Postgres + invalidates Redis config cache |
| Infrastructure stats | `GET /api/admin/infrastructure` | Live `os` module stats + service health pings |
| Audit logs | `GET /api/admin/audit-logs` | Reads `AuditLog` table |
| Abuse detection | `GET /api/admin/abuse/signals` | Aggregates last 24h usage events per tenant, flags spikes |

### Audit log

Every admin mutation writes an `AuditLog` row:
```js
prisma.auditLog.create({
  data: { action, resource, tenantId, details, ipAddress, userAgent }
})
```

Logins also write `LOGIN_SUCCESS` entries from the auth route. The log is append-only and admin-readable.

---

## 11. ML Prediction

On the Analytics page, TensorFlow.js runs entirely in the browser — no server involved.

```
Page opens
    │
    ▼
Fetch /api/usage/history?months=6  →  6 months of UsageAggregate rows
Fetch /api/usage/summary           →  current month so far
    │
    ▼
dynamic import('@/lib/ml-predictor')
    │  (TF.js ~150 KB, loaded only on this page, code-split by Next.js)
    ▼
For each metric (storage, upload, download, requests):
  - Build training rows: X = [rollingAvg, trend], Y = monthly total
  - Normalise to [0,1]
  - Train Dense(1) linear regression, 300 epochs, Adam lr=0.05
  - Predict end-of-month value
  - Blend with current pace:
      final = dayFraction × pacePrediction + (1 - dayFraction) × modelPrediction
  - Dispose all tensors (prevent GPU memory leak)
    │
    ▼
Apply pricing formula to predicted values → estimated cost
    │
    ▼
Render prediction cards with confidence badges (high / medium / low)
```

No data leaves the browser. Training completes in under 50ms for 2–10 data points.

---

## 12. Caching Strategy

| Cache key pattern | What it stores | TTL |
|---|---|---|
| `rl:tenant:<id>` | Rate limit counter | `rateLimitWindow` seconds (auto-reset) |
| `rl:config:<id>` | Tenant rate limit config (max, window) | 300 seconds |
| `billing:estimate:<id>` | Billing estimate result | 120 seconds |
| `usage:summary:<id>` | Usage summary | 60 seconds |
| `usage:history:<id>:<months>` | Usage history | 300 seconds |

If Redis is unavailable, all cache reads miss and the system falls back to Postgres. Rate limiting fails open — no 429s if Redis is down.

---

## 13. Infrastructure Stats

The admin Infrastructure page shows live CPU, memory, and service health. These come from Node.js built-in modules, read fresh on every request:

```js
import os from 'os';

os.totalmem()         // total RAM on the server machine
os.freemem()          // free RAM right now
os.loadavg()[0]       // 1-minute CPU load average
os.cpus().length      // number of CPU cores
process.memoryUsage() // Node process heap usage

// cpuPercent = min(100, (loadAvg / coreCount) * 100)
```

On Render, these reflect the container's allocated resources. On local Docker, they reflect your machine.

Service health pings run at the same time:
```
PostgreSQL: prisma.$queryRaw`SELECT 1`    → measures round-trip ms
Redis:      redis.ping()                  → measures round-trip ms
MinIO:      minioClient.bucketExists(...) → measures round-trip ms
```

No polling, no WebSocket, no background worker — pure snapshot per request.

---

## 14. Data Storage Map

| Data | Where | Notes |
|---|---|---|
| Tenant accounts | Postgres `tenants` | passwords stored as bcrypt hashes |
| Admin accounts | Postgres `admins` | separate table, same bcrypt hashing |
| Buckets | Postgres `buckets` | metadata only |
| File metadata | Postgres `objects` | key, size, contentType, MinIO path |
| File bytes | MinIO | path: `<tenantId>/<bucketId>/<key>` |
| API keys | Postgres `api_keys` | stored as SHA-256 hash, plaintext never saved |
| Every API action | Postgres `usage_events` | one row per call |
| Monthly rollups | Postgres `usage_aggregates` | pre-rolled; needs cron to populate |
| Invoices | Postgres `invoices` | needs cron to generate at month end |
| Pricing rules | Postgres `pricing_rules` | editable by admin |
| Audit trail | Postgres `audit_logs` | admin actions + logins |
| Rate limit counters | Redis `rl:tenant:<id>` | integer with TTL, auto-resets |
| Rate limit config cache | Redis `rl:config:<id>` | 5-min cache of Postgres tenant row |
| Billing estimate cache | Redis `billing:estimate:<id>` | 2-min cache |
| Usage summary cache | Redis `usage:summary:<id>` | 1-min cache |
| Auth tokens | Browser localStorage | JWT, 7-day expiry |
| ML model | Browser memory only | trained and discarded each page visit |

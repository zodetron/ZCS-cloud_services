# StorageCloud — Version 1

**A production-grade multi-tenant object storage SaaS platform.**

---

## Table of Contents

1. [What This Is](#1-what-this-is)
2. [Why We Built It This Way](#2-why-we-built-it-this-way)
3. [System Architecture](#3-system-architecture)
4. [Technology Stack](#4-technology-stack)
5. [Data Storage — What Goes Where](#5-data-storage--what-goes-where)
6. [Database Schema](#6-database-schema)
7. [Backend — How It Works](#7-backend--how-it-works)
8. [Authentication System](#8-authentication-system)
9. [API Key System](#9-api-key-system)
10. [Storage System](#10-storage-system)
11. [Usage Metering & Billing](#11-usage-metering--billing)
12. [Admin System](#12-admin-system)
13. [Frontend — How It Works](#13-frontend--how-it-works)
14. [Every Page Explained](#14-every-page-explained)
15. [Security Decisions](#15-security-decisions)
16. [Deployment Architecture](#16-deployment-architecture)
17. [Environment Variables](#17-environment-variables)
18. [Complete API Reference](#18-complete-api-reference)
19. [Known Limitations & What Is Fake](#19-known-limitations--what-is-fake)
20. [File Structure](#20-file-structure)

---

## 1. What This Is

StorageCloud is a platform that lets developers store files in the cloud using an API, similar to how AWS S3, Cloudflare R2, or Backblaze B2 work. The difference is that StorageCloud is multi-tenant — multiple companies or developers can sign up, each gets their own isolated storage namespace, and each pays based on how much storage and bandwidth they use.

The core product loop:
1. A developer signs up and gets an account
2. They generate an API key
3. They use the API key to create buckets (containers), upload objects (files), and download them
4. Every action they take is recorded and billed at the end of the month
5. A platform admin can see all tenants, suspend accounts, and view audit logs

---

## 2. Why We Built It This Way

### Why Fastify instead of Express
Fastify is faster than Express for JSON APIs (consistently benchmarks 2-3x higher throughput), has built-in schema validation, a structured plugin system, and better TypeScript support even in JavaScript projects. Its `addHook` + `register` system lets you scope middleware to specific route groups without affecting others — this mattered a lot for our auth middleware where the demo API endpoint needs API-key auth but the dashboard endpoints need JWT auth.

### Why Prisma instead of raw SQL
Prisma gives us type-safe database access, automatic migration management, and a readable schema format. It handles BigInt conversions for byte counts, composite unique constraints for multi-tenant bucket naming, and cascade deletes so if a tenant is removed, all their data is cleaned up automatically.

### Why MinIO instead of directly using S3
MinIO runs locally in Docker and speaks the exact same S3 API that AWS S3, Cloudflare R2, Backblaze B2, and every other major object store uses. The `minio` npm package is actually a full S3-protocol client. This means in development you get a real file storage system locally with zero cloud costs, and in production you swap four environment variables to point at a real cloud provider — no code changes required.

### Why Zustand instead of Redux
Zustand has almost no boilerplate, works with React 19, and the `persist` middleware handles localStorage sync out of the box. For an auth store that just needs token + tenant data, Zustand is the right size.

### Why the `persist` + `_hasHydrated` pattern
Zustand's `persist` middleware reads from localStorage asynchronously on the client. There's a gap between the server render (where `isAuthenticated` is always `false`) and the moment Zustand finishes reading from localStorage. Without `_hasHydrated`, the AuthGuard would see `isAuthenticated: false` immediately and redirect to login on every page reload. The `_hasHydrated` flag makes the guard wait until Zustand has finished reading from storage before deciding to redirect.

### Why cookies AND localStorage
The JWT is stored in both. localStorage is read by the API client for Authorization headers. A cookie (`auth_token`, 7-day expiry, SameSite=Lax) is written on login so the session survives browser restarts and hard reloads. When Zustand rehydrates, it also refreshes the cookie.

### Why a separate demo page
The `/demo` page lets anyone with an API key try the real storage API interactively, without looking at code. Every action on the demo page creates real data in the database, charges real usage, and appears in the dashboard's activity feed. This was intentional — the demo is not a sandbox, it is the real API with a nice UI on top.

### Why Fastify scoped plugins for metering routes
The metering module has two different auth requirements: the `/demo/usage` endpoint needs API-key auth (for the demo page, which doesn't have a JWT), but all the `/usage/*` dashboard endpoints need JWT auth. Fastify's plugin encapsulation system means hooks added inside a `register(async (scope) => {...})` call only apply inside that scope. We use two separate scopes in the same file, each with its own `addHook`, so the routes stay co-located without interfering with each other.

---

## 3. System Architecture

### Production (single-container, Render)

```
┌─────────────────────────────────────────────────────────────┐
│                         Internet                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
              ┌────────▼──────────────────────────────────┐
              │         Single App Container              │
              │                                           │
              │  ┌──────────┐  routes /api/* → Backend   │
              │  │  Nginx   │  routes /*     → Frontend   │
              │  │  $PORT   │                             │
              │  └────┬──┬──┘                             │
              │       │  │                                │
              │  ┌────▼─┐ └──────────────┐               │
              │  │Next  │                │               │
              │  │.js   │   ┌────────────▼──┐            │
              │  │:3000 │   │  Fastify API  │            │
              │  └──────┘   │  :4000        │            │
              │             └───────────────┘            │
              └───────────────────────────────────────────┘
                       │             │
          ┌────────────▼──┐   ┌──────▼──────┐
          │  Neon Postgres │   │Upstash Redis│
          │  (hosted)      │   │  (hosted)   │
          └───────────────┘   └─────────────┘
                       │
          ┌────────────▼──┐
          │  MinIO / B2   │
          │  (file bytes) │
          └───────────────┘
```

### Local development (docker-compose)

```
┌─────────────────────────────────────────────────────────────┐
│                         localhost                           │
│                                                             │
│  :3000 → Single App Container (nginx → next.js + fastify)  │
│  :5432 → PostgreSQL (local)                                 │
│  :6379 → Redis (local)                                      │
│  :9000 → MinIO API (local)                                  │
│  :9001 → MinIO Console (local)                              │
└─────────────────────────────────────────────────────────────┘
```

### Request flow for an API upload
```
Developer App
  │  POST /api/storage/buckets/my-bucket/upload
  │  Header: X-API-Key: sk_live_xxxxx
  ▼
Fastify Backend
  │  1. authenticateApiKey middleware:
  │     - SHA256 hash the API key
  │     - Look up hash in api_keys table
  │     - Validate: exists, status=active, not expired
  │     - Update lastUsedAt
  │     - Set req.tenantId, req.apiKeyId
  │  2. Route handler:
  │     - Find bucket record in PostgreSQL
  │     - Construct storageKey: {tenantId}/{bucketId}/{key}
  │     - PUT bytes into MinIO at storageKey
  │     - Upsert Object record in PostgreSQL
  │     - Write UsageEvent to PostgreSQL
  │  3. Return {object, bytes, cost}
  ▼
  PostgreSQL: Object record + UsageEvent record created
  MinIO: File bytes stored at tenantId/bucketId/key
```

---

## 4. Technology Stack

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Node.js | 18+ (LTS) | Runtime |
| Fastify | 4.28.1 | HTTP framework |
| `@fastify/cors` | 9.0.1 | Cross-origin requests |
| `@fastify/helmet` | 11.1.1 | Security headers |
| `@fastify/multipart` | 8.3.0 | File upload parsing |
| Prisma | 5.22.0 | Database ORM + migrations |
| PostgreSQL | 16 | Primary database |
| MinIO client | 8.0.1 | S3-protocol object storage |
| Redis / ioredis | 7 / 5.4.1 | Rate limiting |
| BullMQ | 5.12.0 | Background job queues (wired, not yet used) |
| bcryptjs | 2.4.3 | Password hashing |
| jsonwebtoken | 9.0.2 | JWT sign/verify |
| Winston | 3.13.0 | Structured logging |
| uuid | 10.0.0 | UUID generation |
| dotenv | 16.4.5 | Environment config |

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| Next.js | 16.2.6 | React framework (App Router) |
| React | 19.2.4 | UI library |
| Tailwind CSS | 4 | Styling |
| Zustand | 5.0.13 | Client state management |
| Framer Motion | 12.38.0 | Animations |
| Recharts | 3.8.1 | Charts (analytics/billing) |
| Lucide React | 1.14.0 | Icon library |
| next-themes | 0.4.6 | Dark/light mode |
| Radix UI | Various | Accessible UI primitives |

### Infrastructure
| Technology | Purpose |
|---|---|
| Docker + Docker Compose | Container orchestration |
| Nginx | Reverse proxy inside app container — routes `/api/*` and `/*` |
| supervisord | Process manager — runs nginx + Next.js + Fastify in one container |
| Neon | Hosted PostgreSQL (production) |
| PostgreSQL 16 | Local database (development via docker-compose) |
| Upstash | Hosted Redis (production) |
| Redis 7 | Local rate limiting/caching (development via docker-compose) |
| MinIO | Self-hosted S3-compatible object storage (local dev) |
| Backblaze B2 / Cloudflare R2 | S3-compatible cloud storage (production — pending setup) |

---

## 5. Data Storage — What Goes Where

### PostgreSQL stores everything except file bytes
- User accounts and hashed passwords
- Admin accounts and hashed passwords
- Bucket definitions (name, region, public flag, which tenant owns it)
- Object metadata (filename, size, content type, the MinIO path where the bytes live)
- API key hashes (never the plaintext key)
- Every API action as a UsageEvent row
- Monthly usage aggregates for billing
- Invoices
- Audit logs
- Pricing rules
- Session tokens

### MinIO stores only file bytes
Files are stored at the path `{tenantId}/{bucketId}/{objectKey}` inside a single MinIO bucket called `storagecloud`. The path structure provides tenant isolation — tenant A's files are physically at a different path prefix from tenant B's, even though they share the same MinIO instance. PostgreSQL holds the metadata (size, content type, the MinIO path), MinIO holds the actual bytes.

### Redis stores rate limit counters
Every API request increments a Redis counter keyed by `ratelimit:{tenantId}:{apiKeyId}`. When the counter exceeds 1000 within a 60-second window, the request is rejected with HTTP 429. Redis is used here because it's fast, supports atomic increment operations, and keys expire automatically. The app continues functioning if Redis is unavailable.

### Browser (localStorage + cookie)
The JWT is stored in `localStorage` under the key `token` and separately in `auth-storage` (Zustand's persist key). A 7-day cookie `auth_token` is also set. The API client reads from `localStorage.token` to set the Authorization header on every request.

---

## 6. Database Schema

### Tenant
The top-level account entity. Every object in the system belongs to a tenant.

```
id           String   (cuid, primary key)
name         String
email        String   (unique)
passwordHash String   (bcrypt, 12 rounds — never stored plaintext)
plan         String   (default: "free")
status       String   (default: "active" — can be "suspended")
role         String   (default: "tenant_admin")
createdAt    DateTime
updatedAt    DateTime

Relations → Bucket[], ApiKey[], UsageEvent[], Invoice[], Session[]
```

### Session
Stores active login sessions (not currently used for JWT verification, kept for future session invalidation).

```
id        String   (cuid)
tenantId  String   (FK → Tenant, cascade delete)
token     String   (unique)
expiresAt DateTime
createdAt DateTime
```

### Bucket
A named container for objects. Unique per tenant by name.

```
id        String   (cuid)
tenantId  String   (FK → Tenant, cascade delete)
name      String   (3–63 chars, lowercase alphanumeric + hyphens)
region    String   (default: "us-east-1")
isPublic  Boolean  (default: false)
createdAt DateTime
updatedAt DateTime

Unique constraint: (tenantId, name)
Relations → Object[]
```

### Object
Metadata for a stored file. The actual bytes live in MinIO at `storageKey`.

```
id          String   (cuid)
tenantId    String   (for fast queries without joining through bucket)
bucketId    String   (FK → Bucket, cascade delete)
key         String   (filename/path within bucket, e.g. "images/logo.png")
size        BigInt   (bytes — BigInt because files can exceed 2GB)
contentType String   (default: "application/octet-stream")
etag        String?  (optional checksum)
metadata    Json?    (custom key-value metadata)
storageKey  String   ({tenantId}/{bucketId}/{key} — MinIO path)
createdAt   DateTime
updatedAt   DateTime

Unique constraint: (bucketId, key)
```

### ApiKey
API credentials for programmatic access. Plaintext key shown once on creation, SHA256 hash stored permanently.

```
id          String    (cuid)
tenantId    String    (FK → Tenant, cascade delete)
name        String    (human label, e.g. "Production Key")
keyHash     String    (unique — SHA256 of the full key)
keyPrefix   String    ("sk_live_" + first 4 random chars — shown in UI)
permissions String[]  (default: ["read", "write"])
status      String    (default: "active" — can be "revoked")
lastUsedAt  DateTime? (updated on every authenticated request)
expiresAt   DateTime? (null = never expires)
createdAt   DateTime
updatedAt   DateTime
```

### UsageEvent
One row per API action. The foundation of metering and billing.

```
id         String   (cuid)
tenantId   String   (FK → Tenant, cascade delete)
eventType  String   (upload, download, delete, create_bucket, list_buckets, etc.)
bytes      BigInt   (bytes transferred — 0 for non-transfer events)
objectKey  String?  (which file)
bucketName String?  (which bucket)
apiKeyId   String?  (which API key made the request)
metadata   Json?    (additional context)
createdAt  DateTime

Indexes: (tenantId, createdAt), (tenantId, eventType)
```

### UsageAggregate
Monthly rollup of usage per tenant. Populated by a background job (not yet implemented — currently the billing estimate recalculates from raw events each time).

```
id            String   (cuid)
tenantId      String
period        String   (e.g. "2025-02")
storageBytes  BigInt
uploadBytes   BigInt
downloadBytes BigInt
requestCount  BigInt
objectCount   BigInt
createdAt     DateTime
updatedAt     DateTime

Unique constraint: (tenantId, period)
```

### Invoice
Monthly billing record.

```
id        String   (cuid)
tenantId  String   (FK → Tenant, cascade delete)
period    String   (e.g. "2025-02")
status    String   (default: "pending" — can be "paid")
subtotal  Float
total     Float
lineItems Json?    (breakdown of charges)
dueAt     DateTime?
paidAt    DateTime?
createdAt DateTime
updatedAt DateTime
```

### PricingRule
Platform-configurable pricing per metric (not yet wired to admin UI).

```
id        String  (cuid)
name      String
metric    String  (e.g. "storage_gb", "egress_gb", "requests_1k")
unitPrice Float
unit      String
freeQuota BigInt  (amount included free before charging)
isActive  Boolean (default: true)
```

### AuditLog
Immutable trail of all platform-level actions.

```
id        String   (cuid)
tenantId  String?  (null for system actions)
action    String   (e.g. "TENANT_SUSPENDED", "BUCKET_CREATED")
resource  String?  (e.g. "bucket/my-bucket")
details   Json?    (additional context)
ipAddress String?
userAgent String?
createdAt DateTime

Index: (tenantId, createdAt)
```

### Admin
Platform operator accounts. Separate table from tenants — admins can never be tenants and vice versa.

```
id           String   (cuid)
email        String   (unique)
passwordHash String   (bcrypt, 12 rounds)
name         String
role         String   (default: "platform_admin")
createdAt    DateTime
updatedAt    DateTime
```

---

## 7. Backend — How It Works

### Bootstrap (`backend/src/index.js`)
Fastify is created with `trustProxy: true` (for accurate IP addresses behind Nginx) and logging disabled (Winston handles logging instead). Then:

1. Register `@fastify/helmet` for security headers
2. Register `@fastify/cors` with origins from `CORS_ORIGINS` env var
3. Register `@fastify/multipart` with 100MB file size limit
4. Register a global `errorHandler` that converts `AppError` subclasses to proper HTTP responses
5. Register route modules under `/api`:
   - `/api/auth` → authRoutes
   - `/api/keys` → apiKeyRoutes
   - `/api/storage` → storageRoutes
   - `/api` → meteringRoutes (covers `/api/demo/usage` + `/api/usage/*`)
   - `/api/billing` → billingRoutes
   - `/api/admin` → adminRoutes
6. Add `GET /api/health` returning `{status: "ok", timestamp, version}`
7. Call `ensureMinioReady()` to create the default bucket if it doesn't exist
8. Start listening on `PORT` (default 4000)

### Error Handling
Custom error classes in `shared/errors.js`:
- `AppError` (base class): `statusCode`, `code`
- `NotFoundError` → 404 `NOT_FOUND`
- `AuthError` → 401 `UNAUTHORIZED`
- `ForbiddenError` → 403 `FORBIDDEN`
- `ValidationError` → 400 `VALIDATION_ERROR`
- `ConflictError` → 409 `CONFLICT`
- `RateLimitError` → 429 `RATE_LIMIT_EXCEEDED`

Any thrown `AppError` subclass is caught by the global handler and returned as `{error: "message", code: "CODE"}`. Unrecognised errors return 500.

### Rate Limiting
Implemented in `src/rate-limit/index.js` using Redis. On each request:
1. Increment a Redis key: `ratelimit:{tenantId}:{apiKeyId}` with a 60-second TTL
2. If counter > 1000, throw `RateLimitError`
3. Set `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` response headers

---

## 8. Authentication System

### How `authenticateApiKey` works
Used on all storage routes. Checks `X-API-Key` header first:

1. If `X-API-Key` is present:
   - SHA256-hash the provided key
   - Query `api_keys` table: `WHERE keyHash = hash AND status = 'active'`
   - If not found: 401
   - If found but expired (`expiresAt < now`): 401
   - Update `lastUsedAt = now`
   - Set `req.tenantId`, `req.apiKeyId`, `req.role = 'developer'`
2. If no `X-API-Key`: fall back to JWT `authenticate()`

This dual-auth means the same storage endpoints work with both API keys (for programmatic access) and JWT (for the dashboard/demo page when a user is logged in).

### How `authenticate` works
Used on dashboard routes (usage, billing, profile).

1. Read `Authorization` header, expect `Bearer <token>`
2. `jwt.verify(token, config.jwt.secret)` — throws on invalid/expired
3. Set `req.tenantId`, `req.role`, `req.tenantEmail`

### How `authenticateAdmin` works
Used on all `/api/admin/*` routes.

1. Same as `authenticate()` (verify JWT)
2. Additionally check `payload.role === 'platform_admin'`
3. If not: 403 Forbidden
4. Set `req.adminId`

### Login flow detail
```
POST /api/auth/login { email, password }

1. Query Tenant WHERE email = email
2. If not found → query Admin WHERE email = email
   If not found there either → 401 "Invalid credentials"
3. bcrypt.compare(password, record.passwordHash)
   If false → 401 "Invalid credentials"
4. If Tenant: check status === 'active' → 403 if suspended
5. jwt.sign({ tenantId, email, role }, JWT_SECRET, { expiresIn: '7d' })
6. Return { token, tenant: { id, name, email, role, plan } }
```

### Registration flow detail
```
POST /api/auth/register { name, email, password }

1. Check Tenant WHERE email = email → 409 "Email already registered" if exists
2. bcrypt.hash(password, 12) → passwordHash
3. prisma.tenant.create({ name, email, passwordHash }) → new Tenant record
4. jwt.sign({ tenantId, email, role }, JWT_SECRET, { expiresIn: '7d' })
5. Return 201 { token, tenant }
```

---

## 9. API Key System

### Key generation (`backend/src/auth/api-keys.js`)

**Create key** `POST /api/keys`:
1. Generate 32 random bytes → `crypto.randomBytes(32).toString('base64url')`
2. Prefix: `sk_live_`
3. Full key: `sk_live_<base64url-32-bytes>` (shown to user once, never again)
4. SHA256 hash the full key → stored in `keyHash` column
5. Store prefix: `sk_live_` + first 4 random chars + `...` → `keyPrefix` (shown in UI list)
6. Store permissions array (default `["read", "write"]`)
7. Store optional `expiresAt`
8. Return `{ key: "sk_live_...", id, name, keyPrefix, permissions, expiresAt, createdAt }`

**Verify key** (in `authenticateApiKey` middleware):
1. Take key from `X-API-Key` header
2. `crypto.createHash('sha256').update(key).digest('hex')`
3. `prisma.apiKey.findUnique({ where: { keyHash: hash } })`
4. Check status and expiry

**Why SHA256 instead of bcrypt for API keys:** API keys are verified on every request (potentially thousands per second). bcrypt is intentionally slow (12 rounds ≈ 100ms). SHA256 is cryptographically secure and fast. For API keys this is the right trade-off. Passwords use bcrypt because login attempts are rare and brute-force protection matters more.

### Key management endpoints
| Method | Path | What it does |
|---|---|---|
| `GET /api/keys` | List all keys for the authenticated tenant | Returns id, name, keyPrefix, permissions, status, lastUsedAt |
| `POST /api/keys` | Create a new key | Returns the full `sk_live_...` key — only time it's visible |
| `PATCH /api/keys/:id/revoke` | Set status = 'revoked' | Key immediately stops working |
| `DELETE /api/keys/:id` | Hard delete the key record | Permanent |

---

## 10. Storage System

### Bucket naming and isolation
Every bucket name must match `^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$` (S3-compatible naming). Bucket names are unique per tenant — two different tenants can each have a bucket called `my-bucket` because the database unique constraint is `(tenantId, name)`, not just `(name)`.

In MinIO, the actual bucket is created as `{tenantId}-{bucketName}` to avoid collisions at the MinIO level.

### Object storage path
Every file is stored at `{tenantId}/{bucketId}/{objectKey}` inside a single MinIO bucket called `storagecloud`. Examples:

```
Tenant A uploads logo.png to bucket "assets":
  MinIO path: cl8x3jkab0000.../cl9y2jkab0001.../logo.png

Tenant B uploads logo.png to their own bucket "assets":
  MinIO path: cm1z4lkab0002.../cm2a5lkab0003.../logo.png
```

The paths are completely different even though both tenants used the same filename and bucket name. This is the multi-tenant isolation.

### Upload methods
**Method 1: Text/JSON upload** `POST /api/storage/buckets/:name/upload`
- Body: `{ key, content, contentType? }`
- Content is a string (text, JSON, base64, etc.)
- Converts to Buffer, calculates byte size
- Streams to MinIO via `putObject()`
- Upserts Object record (if key already exists, updates it)
- Emits UsageEvent `{ eventType: 'upload', bytes }`

**Method 2: File upload** `POST /api/storage/buckets/:name/upload-file`
- Multipart form-data (up to 100MB)
- Unique key: `{base}-{timestamp}{ext}` to avoid collisions from same-named files
- Query param `?key=` can override the filename
- Streams to MinIO, upserts Object record, emits UsageEvent

**Method 3: Presigned upload** (two-step)
1. `POST /api/storage/presign/upload { bucketName, key, contentType, expiresIn }`
   - Returns a presigned PUT URL valid for `expiresIn` seconds (default 3600)
   - Client uploads directly to MinIO using this URL
2. `POST /api/storage/objects/confirm { bucketName, key, storageKey, size, contentType }`
   - After the direct upload completes, client calls this to create the DB record

**Why presigned URLs:** They let clients upload directly to MinIO without the bytes passing through the backend server. For large files this avoids saturating the backend's network connection. The backend only handles metadata.

### Download
`GET /api/storage/buckets/:name/objects/*`
1. Parse the wildcard as the object key
2. Find Object record by `(bucketId, key)`
3. `minioClient.getObject(bucket, storageKey)` returns a readable stream
4. Pipe the stream directly to the HTTP response with correct `Content-Type`
5. Emit UsageEvent `{ eventType: 'download', bytes: object.size }`

### Search
`GET /api/storage/search?q=term`
- Searches `buckets.name` and `objects.key` using `contains` (case-insensitive substring)
- Returns up to 5 matching buckets and 8 matching objects
- Objects include their parent bucket name for display

---

## 11. Usage Metering & Billing

### How every action is recorded
The `emitUsage()` function is called inside every storage route handler:

```javascript
async function emitUsage(tenantId, apiKeyId, eventType, bytes, extra = {}) {
  await prisma.usageEvent.create({
    data: { tenantId, apiKeyId, eventType, bytes: BigInt(bytes), ...extra }
  }).catch(() => {}); // non-fatal — if this fails, the API call still succeeds
}
```

The `.catch(() => {})` is intentional — usage recording is fire-and-forget. A metering database write should never fail an API call.

### Event types recorded
| eventType | When | bytes value |
|---|---|---|
| `upload` | Object stored | bytes written |
| `download` | Object streamed | bytes read |
| `delete` / `delete_object` | Object deleted | 0 |
| `create_bucket` | Bucket created | 0 |
| `delete_bucket` | Bucket deleted | 0 |
| `list_buckets` | Bucket list requested | 0 |
| `list_objects` | Object list requested | 0 |
| `presign_upload` | Presigned upload URL generated | 0 |
| `presign_download` | Presigned download URL generated | 0 |

### Billing calculation
Pricing constants (hardcoded in billing routes, also in PricingRule table for future admin config):

| Resource | Price | Free quota |
|---|---|---|
| Storage | $0.023 per GB | First 5 GB free |
| Egress (download) | $0.09 per GB | First 1 GB free |
| API Requests | $0.0004 per 1,000 | First 10,000 free |

Formula:
```
storageGB = totalObjectBytes / (1024^3)
downloadGB = totalDownloadBytes / (1024^3)

storageCost  = max(0, storageGB - 5)   * 0.023
downloadCost = max(0, downloadGB - 1)  * 0.09
requestCost  = max(0, requestCount - 10000) / 1000 * 0.0004

total = storageCost + downloadCost + requestCost
```

The `GET /api/billing/estimate` endpoint recalculates this from raw `UsageEvent` rows every time it's called. The `UsageAggregate` table exists for pre-computed monthly rollups (a background job would populate this) but in Version 1 the background job is not running.

### Demo usage endpoint
`GET /api/demo/usage` is API-key authenticated (not JWT) and returns the same metering data but scoped to that API key's tenant. This powers the real-time usage meters on the `/demo` page.

---

## 12. Admin System

The admin system requires a `platform_admin` JWT. Admin accounts live in the `admins` table (completely separate from `tenants`). There is no self-signup for admins — they must be created via database seed or directly.

### Seeding an admin
`backend/prisma/seed.js` creates the initial admin account. Run with `npm run db:seed`.

### Admin endpoints

**`GET /api/admin/tenants`** — paginated list of all tenants
- Supports `page`, `limit`, `search` query params
- Search does a case-insensitive `contains` on name or email
- Returns tenant data + `_count: { buckets, apiKeys, usageEvents }`
- Removes `passwordHash` from the response

**`PATCH /api/admin/tenants/:id/status`** — suspend or activate
- Body: `{ status: "suspended" | "active" }`
- Suspended tenants get 403 on login

**`GET /api/admin/stats`** — platform-wide counts
- Total tenants, buckets, objects
- Total storage bytes across all tenants

**`GET /api/admin/audit-logs`** — admin action trail
- Supports `limit` and `tenantId` filter query params

---

## 13. Frontend — How It Works

### App Router structure
The frontend uses Next.js 16 App Router. Every folder under `src/app/` with a `page.js` is a route. Layouts wrap child routes:

- `src/app/layout.js` — root layout (HTML, theme provider)
- `src/app/dashboard/layout.js` — wraps all `/dashboard/*` routes with `AuthGuard`, `Sidebar`, `Topbar`
- `src/app/admin/layout.js` — wraps all `/admin/*` routes with admin-only `AuthGuard`

### AuthGuard
All dashboard pages are protected by `AuthGuard`:

```javascript
// Waits for Zustand to rehydrate from localStorage
if (!_hasHydrated) return <PageLoader />;

// Then checks auth state
if (!isAuthenticated) router.replace("/auth/login");
if (adminOnly && tenant.role !== "platform_admin") router.replace("/dashboard");
```

The `_hasHydrated` check prevents the flash-redirect-to-login bug on page reload.

### API client (`src/lib/api.js`)
All API calls go through a thin wrapper:

```javascript
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

async function request(path, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };
  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const api = {
  get:    (path, opts)       => request(path, { method: 'GET', ...opts }),
  post:   (path, body, opts) => request(path, { method: 'POST', body: JSON.stringify(body), ...opts }),
  patch:  (path, body, opts) => request(path, { method: 'PATCH', body: JSON.stringify(body), ...opts }),
  delete: (path, opts)       => request(path, { method: 'DELETE', ...opts }),
};
```

Every component imports `api` and uses it directly — no Redux thunks, no React Query, just `useEffect` + `useState`.

### Auth store (`src/store/auth.js`)
Zustand store with `persist` middleware:

```javascript
{
  token,           // JWT string
  tenant,          // { id, name, email, role, plan }
  isAuthenticated, // boolean
  _hasHydrated,    // false until persist middleware reads localStorage

  login(token, tenant)  // writes localStorage + cookie + state
  logout()              // clears localStorage + cookie + state
  updateTenant(tenant)  // updates tenant object in state (after profile edit)
  setHasHydrated(true)  // called by onRehydrateStorage callback
}
```

### Topbar features
- **Search bar**: Debounced 300ms search hitting `GET /api/storage/search`. Results dropdown shows buckets and objects grouped separately. Escape/outside-click closes. X button clears.
- **Notification bell**: On click, fetches last 10 events from `GET /api/usage/events`. Shows per-event icons and labels. "Mark read" dismisses the badge. Links to relevant pages.
- **Avatar menu**: Dropdown with links to Profile, Settings, Billing, and sign-out.

### Dark mode
`next-themes` wraps the root layout. Theme is stored in localStorage. The entire app uses Tailwind's `dark:` variants. A `ThemeToggle` button in the Topbar switches modes.

---

## 14. Every Page Explained

### Landing page (`/`)
Marketing page. Sections: Navbar, Hero, Features, How It Works, Pricing, Developer section (code snippets), CTA. All content is static marketing copy. The infrastructure diagram in the hero section is an animated SVG with nodes and data packets — purely cosmetic, not connected to real data.

### Login (`/auth/login`)
Form with email + password. Calls `POST /api/auth/login`. On success, writes to Zustand store (which writes to localStorage + cookie) then redirects to `/dashboard` (or `/admin` if `role === 'platform_admin'`).

### Register (`/auth/register`)
Form with name, email, password. Calls `POST /api/auth/register`. Same flow as login on success.

### API Explorer (`/demo`)
The public demo page. Accepts an API key (does not require login). On "Connect", verifies the key by calling `GET /api/storage/buckets`. Once connected:
- Shows real buckets for that key's tenant
- Lets you upload text/JSON or drag-and-drop files
- Download actually streams the file and triggers a browser download
- Delete removes the object from storage and the database
- Usage meters poll `GET /api/demo/usage` every 5 seconds showing real costs
- All actions emit real UsageEvents that appear in the dashboard

### Dashboard Overview (`/dashboard`)
Fetches `GET /api/usage/summary`, `GET /api/usage/events?limit=8`, `GET /api/keys`. Shows: stat cards (storage, requests, objects, API keys), recent activity list, quick action buttons.

### Buckets (`/dashboard/buckets`)
Fetches `GET /api/storage/buckets`. Card grid showing each bucket's name, region, object count, public/private status. "New bucket" modal calls `POST /api/storage/buckets`. Delete button (only enabled if bucket is empty) calls `DELETE /api/storage/buckets/:name`.

### API Keys (`/dashboard/api-keys`)
Fetches `GET /api/keys`. Card list of all API keys. "Create key" modal calls `POST /api/keys` and shows the full `sk_live_...` key in a copy-box (one time only — the modal stays open until you click "Done"). Revoke calls `PATCH /api/keys/:id/revoke`. Delete calls `DELETE /api/keys/:id`.

### Analytics (`/dashboard/analytics`)
Fetches `GET /api/usage/summary` and `GET /api/usage/history?months=6`. Stat cards for upload GB, download GB, total requests, storage GB. Three charts: bandwidth area chart (upload vs download MB by month), requests bar chart (by month), storage growth line chart (GB by month). All real data from the database.

### Billing (`/dashboard/billing`)
Fetches `GET /api/billing/estimate` and `GET /api/billing/invoices`. Shows the current month's estimated cost broken down by storage, download, and requests. Invoice history list on the right. Invoice download button exists in UI but does not generate a PDF (not implemented in V1).

### Activity Feed (`/dashboard/activity`)
Polls `GET /api/usage/events?limit=50` every 4 seconds when "Live" mode is on. Each event shown with an icon (upload=blue, download=green, delete=red, bucket=purple, presign=cyan), the object key, bucket name, byte size, and time ago. Empty state prompts user to try the API Explorer.

### Settings (`/dashboard/settings`)
Four tabs:
- **Profile**: Name + email fields, save calls `PATCH /api/auth/me`, updates Zustand store with response
- **Security**: Password change form, also calls `PATCH /api/auth/me` with `currentPassword` + `newPassword`
- **Notifications**: Toggle switches (UI only, not persisted in V1)
- **Plan**: Plan comparison table (static)

### Profile (`/dashboard/profile`)
Fetches `GET /api/usage/summary` and `GET /api/keys`. Shows: avatar with color derived from username, plan-colored banner, inline edit for name/email (calls `PATCH /api/auth/me`), stat boxes (objects, requests, API key count), quick links to Settings/Billing/API Keys, sign-out button.

### Admin Overview (`/admin`)
Admin-only. Fetches `GET /api/admin/stats` and `GET /api/admin/tenants?limit=5`. Stat cards: total tenants, total storage, total buckets, total objects. System health panel (static "operational" status — V1 limitation). Recent tenants table.

### Admin Tenants (`/admin/tenants`)
Fetches `GET /api/admin/tenants?limit=50`. Debounced search calls the same endpoint with `?search=`. Suspend/Activate button calls `PATCH /api/admin/tenants/:id/status`. Table shows: name, email, plan, status, bucket count, event count, join date.

### Admin Logs (`/admin/logs`)
Fetches `GET /api/admin/audit-logs?limit=100`. Client-side filter by action type, tenant ID, or resource. Each log row shows action badge (color-coded), resource path, tenant info, timestamp.

### Admin Infrastructure (`/admin/infrastructure`)
CPU, memory, and disk I/O metrics are simulated with `Math.random()` updating every 1.5 seconds. Service node counts are hardcoded. This is the only page with deliberately fake data — there is no backend health check endpoint in V1.

---

## 15. Security Decisions

### Passwords — bcrypt with 12 rounds
bcrypt is a key derivation function designed to be slow. 12 rounds means each hash takes ~100-200ms on a modern CPU. This makes brute-force attacks computationally expensive. Even if the database is compromised, recovering passwords takes enormous time.

Why bcrypt and not Argon2? bcryptjs is a pure JavaScript implementation with no native dependencies, making it simpler to deploy in Docker containers across different architectures. Argon2 is technically better but bcrypt is still considered secure and the tradeoff is acceptable.

### API keys — SHA256 hash
SHA256 is used instead of bcrypt for API key storage because:
1. Keys are 32 random bytes (256 bits of entropy) — there's nothing to brute force
2. API keys are verified on every request, potentially thousands per second
3. bcrypt at 12 rounds takes ~100ms — unacceptable for a hot authentication path
4. A SHA256 of a 256-bit random value cannot be reversed

The key is generated with `crypto.randomBytes(32)` which uses the OS's cryptographically secure random number generator.

### JWT — HS256, 7-day expiry
JWTs are signed with a shared secret (`JWT_SECRET` env var). The payload contains `tenantId`, `email`, and `role`. Tokens expire after 7 days. There is no token revocation in V1 — a logged-out user's token remains technically valid until it expires (the session table exists for future revocation support).

### CORS
Origins are configured via `CORS_ORIGINS` env var (comma-separated). In development: `http://localhost:3000`. In production: your actual frontend domain. The backend will reject requests from any other origin.

### Rate limiting
1,000 requests per 60-second window per tenant/API key combination. Implemented in Redis with atomic INCR + TTL. Headers returned: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`.

### Multipart file upload limit
Files larger than 100MB are rejected by `@fastify/multipart`. This prevents disk exhaustion from large uploads. The limit is configurable via the plugin options.

### Production security gaps in V1
- MinIO port 9000 is exposed publicly in `docker-compose.yml` (development config). In `docker-compose.prod.yml` it's on the internal network only.
- Default MinIO credentials (`minioadmin/minioadmin`) in development config
- `JWT_SECRET` defaults to a dev value — must be changed for production
- No SSL between backend and MinIO in development
- 2FA does not exist

---

## 16. Deployment Architecture

### Single-Container Design
Backend (Fastify) and Frontend (Next.js) run together in one Docker image using `supervisord` to manage three processes:

| Process | Internal Port | Role |
|---|---|---|
| nginx | `$PORT` (Render sets this) | Entry point — routes all traffic |
| Next.js (standalone) | 3000 | Serves frontend pages |
| Fastify | 4000 (`BACKEND_PORT`) | Serves API |

nginx uses `envsubst` to substitute `${PORT}` into its config at container startup, so it binds to whatever port Render assigns. This prevents Render from routing to the wrong process.

### Development (`docker-compose.yml`)
One `app` container (nginx + Next.js + Fastify) plus local postgres, redis, and minio sidecars.

```
localhost:3000  → App container (nginx → Next.js + Fastify)
localhost:5432  → PostgreSQL (local)
localhost:6379  → Redis (local)
localhost:9000  → MinIO API (local)
localhost:9001  → MinIO Console (local)
```

### Production — Render
| Service | Provider | Notes |
|---|---|---|
| App (frontend + backend) | Render Web Service | Single container, root `Dockerfile` |
| Database | Neon (hosted Postgres) | Connection string with `?sslmode=require` |
| Cache | Upstash (hosted Redis) | `rediss://` URL (SSL required) |
| File storage | Pending — Backblaze B2 | Not yet configured |

URL: **https://zcs-bfm3.onrender.com**

### Environment variable loading (unified `.env`)
A single `.env` at the project root serves all services:
- **Backend** loads it via `dotenv` with explicit path: `backend/src/config/index.js` → `../../../.env`
- **Frontend** (Next.js build) loads it via `dotenv` in `next.config.mjs` → `../.env`
- **docker-compose** reads it automatically (it's in the same directory)
- **Render / Docker**: vars are injected by the platform — `dotenv` silently ignores the missing file and never overwrites existing `process.env` vars

`NEXT_PUBLIC_*` vars must be set as Docker build args (`build.args` in docker-compose, **Build Arguments** in Render) since Next.js bakes them into the JS bundle at build time, not runtime.

### Switching from MinIO to a cloud provider (no code changes needed)
The `minio` npm client speaks the S3 protocol. To use Backblaze B2, Cloudflare R2, or AWS S3, change these env vars:

**Backblaze B2 (recommended — free 10GB, no credit card):**
```
MINIO_ENDPOINT=s3.us-west-004.backblazeb2.com
MINIO_PORT=443
MINIO_USE_SSL=true
MINIO_ACCESS_KEY=<b2-key-id>
MINIO_SECRET_KEY=<b2-app-key>
```

**Cloudflare R2:**
```
MINIO_ENDPOINT=<account-id>.r2.cloudflarestorage.com
MINIO_PORT=443
MINIO_USE_SSL=true
MINIO_ACCESS_KEY=<r2-access-key-id>
MINIO_SECRET_KEY=<r2-secret-access-key>
```

**AWS S3:**
```
MINIO_ENDPOINT=s3.amazonaws.com
MINIO_PORT=443
MINIO_USE_SSL=true
MINIO_ACCESS_KEY=<aws-access-key-id>
MINIO_SECRET_KEY=<aws-secret-access-key>
```

---

## 17. Environment Variables

All variables live in a single `.env` at the project root (replaces the old `backend/.env` and `frontend/.env.local`). See `.env.example` for the full template.

| Variable | Default | Required in prod | Purpose |
|---|---|---|---|
| `DATABASE_URL` | `postgresql://...@localhost:5432/storagecloud` | Yes | Full Postgres connection string. For Neon: append `?sslmode=require` |
| `POSTGRES_USER` | `postgres` | No | Used by docker-compose to start local postgres |
| `POSTGRES_PASSWORD` | `postgres` | No | Used by docker-compose to start local postgres |
| `POSTGRES_DB` | `storagecloud` | No | Used by docker-compose to start local postgres |
| `REDIS_URL` | (empty) | Yes (prod) | Full Redis connection string. For Upstash: `rediss://default:TOKEN@host:6379`. If set, overrides host/port/password below |
| `REDIS_HOST` | `localhost` | No | Redis hostname (used when REDIS_URL is not set) |
| `REDIS_PORT` | `6379` | No | Redis port |
| `REDIS_PASSWORD` | (empty) | No | Redis password |
| `MINIO_ENDPOINT` | `localhost` | Yes | MinIO/S3 hostname |
| `MINIO_PORT` | `9000` | Yes | MinIO port (443 for cloud) |
| `MINIO_USE_SSL` | `false` | Yes | `true` for cloud providers |
| `MINIO_ACCESS_KEY` | `minioadmin` | Yes | MinIO/S3 access key |
| `MINIO_SECRET_KEY` | `minioadmin` | Yes | MinIO/S3 secret key |
| `MINIO_DEFAULT_BUCKET` | `storagecloud` | No | Internal bucket name |
| `JWT_SECRET` | `change-me-in-production` | **Critical** | Sign/verify JWTs — use 64+ random chars |
| `JWT_EXPIRES_IN` | `7d` | No | Token lifetime |
| `JWT_REFRESH_SECRET` | `change-me-refresh-in-production` | No | Refresh token secret (V2) |
| `PORT` | `80` | No | Port nginx listens on. **Do not set in Render** — let Render set it automatically |
| `BACKEND_PORT` | `4000` | No | Port Fastify listens on (always internal, never exposed) |
| `NODE_ENV` | `development` | Yes | `production` for prod |
| `CORS_ORIGINS` | `http://localhost:3000` | Yes | Comma-separated allowed frontend origins |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3000` | Yes | Full URL the browser uses to call the API. Must also be set as a **build arg** in Render. |

---

## 18. Complete API Reference

All endpoints are prefixed with the backend URL (default `http://localhost:4000`).

### Public endpoints (no auth)
| Method | Path | Body | Response |
|---|---|---|---|
| `GET` | `/api/health` | — | `{status, timestamp, version}` |
| `POST` | `/api/auth/register` | `{name, email, password}` | `{token, tenant}` |
| `POST` | `/api/auth/login` | `{email, password}` | `{token, tenant}` |

### Tenant endpoints (JWT required: `Authorization: Bearer <token>`)
| Method | Path | Body/Query | Response |
|---|---|---|---|
| `GET` | `/api/auth/me` | — | `{tenant}` |
| `PATCH` | `/api/auth/me` | `{name?, email?, currentPassword?, newPassword?}` | `{tenant}` |
| `GET` | `/api/keys` | — | `{apiKeys: [...]}` |
| `POST` | `/api/keys` | `{name, permissions?, expiresIn?}` | `{key: {id, name, key, ...}}` |
| `PATCH` | `/api/keys/:id/revoke` | — | `{message}` |
| `DELETE` | `/api/keys/:id` | — | 204 |
| `GET` | `/api/usage/summary` | — | `{period, storageBytes, uploadBytes, downloadBytes, requestCount, objectCount}` |
| `GET` | `/api/usage/history` | `?months=6` | `{history: [...]}` |
| `GET` | `/api/usage/events` | `?limit=20&offset=0` | `{events: [...]}` |
| `GET` | `/api/billing/estimate` | — | `{period, usage, costs, pricing}` |
| `GET` | `/api/billing/invoices` | — | `{invoices: [...]}` |
| `GET` | `/api/billing/invoices/:id` | — | `{invoice}` |

### Storage endpoints (API key OR JWT)
| Method | Path | Body/Query | Response |
|---|---|---|---|
| `GET` | `/api/storage/buckets` | — | `{buckets: [...]}` |
| `POST` | `/api/storage/buckets` | `{name, isPublic?, region?}` | 201 `{bucket}` |
| `DELETE` | `/api/storage/buckets/:name` | — | 204 |
| `GET` | `/api/storage/buckets/:name/objects` | `?prefix&limit&offset` | `{objects, total, bucket}` |
| `POST` | `/api/storage/buckets/:name/upload` | `{key, content, contentType?}` | 201 `{object, bytes, cost}` |
| `POST` | `/api/storage/buckets/:name/upload-file` | multipart + `?key=` | 201 `{object, bytes, filename, cost}` |
| `GET` | `/api/storage/buckets/:name/objects/*` | — | Binary file stream |
| `DELETE` | `/api/storage/buckets/:name/objects/*` | — | 204 |
| `POST` | `/api/storage/presign/upload` | `{bucketName, key, contentType?, expiresIn?}` | `{url, storageKey, expiresIn, expiresAt}` |
| `POST` | `/api/storage/presign/download` | `{bucketName, key, expiresIn?}` | `{url, expiresIn}` |
| `POST` | `/api/storage/objects/confirm` | `{bucketName, key, storageKey, size?, contentType?, metadata?}` | 201 `{object}` |
| `GET` | `/api/storage/search` | `?q=term` | `{buckets: [...5], objects: [...8]}` |
| `GET` | `/api/demo/usage` | — | `{period, storageBytes, uploadBytes, downloadBytes, requestCount, costs, recentEvents}` |

### Admin endpoints (platform admin JWT required)
| Method | Path | Body/Query | Response |
|---|---|---|---|
| `GET` | `/api/admin/tenants` | `?page&limit&search` | `{tenants, total, page, pages}` |
| `PATCH` | `/api/admin/tenants/:id/status` | `{status}` | `{message}` |
| `GET` | `/api/admin/stats` | — | `{tenants, buckets, objects, totalStorageBytes}` |
| `GET` | `/api/admin/audit-logs` | `?limit&tenantId` | `{logs: [...]}` |

---

## 19. Known Limitations & What Is Fake

### Things that show UI but are not connected to a backend in V1

| Page / Feature | What looks real but isn't | Impact |
|---|---|---|
| Admin Infrastructure | CPU/memory/disk metrics are `Math.random()` — no real monitoring endpoint | Medium — looks like a real ops dashboard but shows random numbers |
| Admin System Health | "All systems operational" is always hardcoded | Low |
| Settings Notifications | Toggle state is React `useState` only — not saved to the database | Low |
| Billing invoice download button | Clicking it does nothing — no PDF generation | Low |
| Settings 2FA button | "Enable 2FA" button exists but 2FA is not implemented | Low |
| `/docs` link in sidebar | Links to `/docs` which returns 404 | Low |

### Architecture limitations in V1

| Limitation | Detail |
|---|---|
| No background workers | BullMQ is installed and wired but no job processors exist. UsageAggregates are never populated from the background — billing estimate recalculates from raw events each time. |
| No token revocation | Logout clears the client-side token but the JWT itself remains valid until it expires (7 days). The Session table exists for future revocation. |
| No email | No email verification on signup, no password reset email, no invoice emails. |
| No webhook system | No way for tenants to receive notifications when storage events happen. |
| No CDN | Files serve directly from MinIO/backend. No edge caching. |
| UsageAggregate not populated | The `usage/history` endpoint returns empty unless aggregates have been manually inserted. |
| File storage not connected in production | MinIO runs locally in docker-compose but Render cannot host MinIO. Backblaze B2 or Cloudflare R2 must be configured via env vars for file uploads to work in production. |
| Seed runs on every container start | The seed script runs every time the container starts. Harmless (Prisma upserts), but adds ~10s to startup. Fix: add existence check in seed.js before inserting. |
| JWT secrets are placeholder values | `JWT_SECRET=change-me-in-production` is the default. Must be replaced with a 64+ character random string before handling real user data. |

---

## 20. File Structure

```
/ (project root)
├── .env                       — unified env for all services (gitignored)
├── .env.example               — env var template with all variables documented
├── .gitignore                 — excludes .env, node_modules, .next, .claude, etc.
├── Dockerfile                 — single-container build (backend + frontend + nginx)
├── entrypoint.sh              — DB migration + seed + envsubst nginx + start supervisord
├── nginx-app.conf             — nginx template (uses ${PORT} substituted at runtime)
├── supervisord.conf           — manages nginx, Next.js, Fastify as one unit
├── docker-compose.yml         — local dev: app + postgres + redis + minio
├── docker-compose.prod.yml    — production: app + internal postgres + redis + minio
├── nginx.conf                 — kept for reference (multi-container setup)
├── VERSION_1.md               — this document
├── DEPLOYMENT_FIXES.md        — record of all deployment issues and fixes
│
├── backend/
│   ├── Dockerfile             — kept for reference (single-service build)
│   ├── entrypoint.sh          — kept for reference (single-service startup)
│   ├── package.json
│   ├── prisma/
│   │   ├── schema.prisma      — 11 database models
│   │   ├── seed.js            — creates default admin + demo tenant
│   │   └── migrations/        — auto-generated migration files
│   └── src/
│       ├── index.js           — Fastify bootstrap, plugin registration
│       ├── config/index.js    — unified env config (reads REDIS_URL, BACKEND_PORT, etc.)
│       ├── middleware/
│       │   └── auth.js        — authenticate, authenticateApiKey, authenticateAdmin
│       ├── shared/
│       │   ├── errors.js      — AppError subclasses + errorHandler
│       │   ├── logger.js      — Winston logger
│       │   ├── redis.js       — ioredis client (URL-first, host/port fallback)
│       │   ├── cache.js       — get/set/invalidate helpers over redis
│       │   ├── prisma.js      — PrismaClient singleton
│       │   └── minio.js       — MinIO client + ensureMinioReady
│       ├── auth/
│       │   ├── routes.js      — register, login, /me, PATCH /me
│       │   └── api-keys.js    — CRUD for API keys
│       ├── storage/
│       │   └── routes.js      — buckets, objects, presign, search
│       ├── metering/
│       │   └── routes.js      — usage summary, history, events (two scoped plugins)
│       ├── billing/
│       │   └── routes.js      — estimate, invoices
│       ├── admin/
│       │   └── routes.js      — tenant management, stats, audit logs
│       └── rate-limit/
│           └── index.js       — Redis-backed rate limiter
│
└── frontend/
    ├── Dockerfile             — kept for reference (single-service build)
    ├── package.json           — includes dotenv (needed for next.config.mjs)
    ├── next.config.mjs        — loads root .env, defines rewrites
    └── src/
        ├── app/
        │   ├── layout.js                    — root layout (theme provider)
        │   ├── page.js                      — landing page
        │   ├── globals.css
        │   ├── auth/
        │   │   ├── login/page.js
        │   │   └── register/page.js
        │   ├── demo/page.js                 — API explorer
        │   ├── dashboard/
        │   │   ├── layout.js               — AuthGuard + Sidebar + Topbar
        │   │   ├── page.js                 — overview
        │   │   ├── buckets/page.js
        │   │   ├── api-keys/page.js
        │   │   ├── analytics/page.js
        │   │   ├── billing/page.js
        │   │   ├── activity/page.js
        │   │   ├── settings/page.js
        │   │   └── profile/page.js
        │   └── admin/
        │       ├── layout.js               — adminOnly AuthGuard
        │       ├── page.js                 — platform overview
        │       ├── tenants/page.js
        │       ├── logs/page.js
        │       └── infrastructure/page.js
        ├── lib/
        │   ├── api.js          — fetch wrapper using NEXT_PUBLIC_API_URL
        │   ├── animations.js   — Framer Motion variants
        │   └── utils.js        — cn() class merging utility
        ├── store/
        │   └── auth.js         — Zustand auth store with persist + cookie sync
        └── components/
            ├── ui/             — reusable primitives (StatCard, GradientButton, etc.)
            ├── dashboard/
            │   ├── sidebar.jsx — nav links, collapse, user info, logout
            │   └── topbar.jsx  — search, notifications, profile dropdown
            ├── admin/
            │   └── sidebar.jsx — admin navigation
            ├── auth/
            │   └── auth-guard.jsx — route protection, hydration-aware
            └── landing/
                ├── navbar.jsx
                ├── hero.jsx
                ├── features.jsx
                ├── pricing.jsx
                ├── infrastructure-visual.jsx — animated SVG diagram
                └── developer-section.jsx
```

---

*Version 1 — updated May 2026. Live at https://zcs-bfm3.onrender.com*

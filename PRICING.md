# ZCS Pricing — How It Actually Works

This document traces pricing from the moment a user does something (upload, download, API call) all the way to what appears on their bill. Everything here is derived directly from the source code.

---

## The Three Things That Cost Money

| What | Free Tier | Rate After Free Tier | Code Location |
|---|---|---|---|
| **Storage** (data at rest) | 5 GB | $50 / GB / month | `billing/routes.js` |
| **Upload bandwidth** | none | $30 / GB | `billing/routes.js` |
| **Egress** (downloads only) | 1 GB / month | $20 / GB | `billing/routes.js` |
| **API Requests** | 10,000 / month | $0.50 / request ($500 / 1k) | `billing/routes.js` |

Uploads are **free**. You pay for storing the result and for sending it back out — not for putting it in.

---

## Step 1 — Something Happens → A `UsageEvent` Row Is Written

Every time a tenant performs an operation, the backend calls `emitUsage()` in `storage/routes.js`:

```js
async function emitUsage(tenantId, apiKeyId, eventType, bytes, extra = {}) {
  await prisma.usageEvent.create({ data: { tenantId, eventType, bytes, ... } });
}
```

The `eventType` values that end up mattering for billing:

| Event Type | Bytes Recorded | Counted In |
|---|---|---|
| `upload` | actual file bytes | upload bandwidth (currently not charged) |
| `download` | object size | egress cost |
| `create_bucket` | 0 | request count |
| `delete_bucket` | 0 | request count |
| `list_buckets` | 0 | request count |
| `list_objects` | 0 | request count |
| `delete` | 0 | request count |
| `presign_upload` | 0 | request count |
| `presign_download` | 0 | request count |

Every single event, regardless of bytes, increments the request count. That is what `prisma.usageEvent.count()` measures.

**Critical rule: `emitUsage` is only called after a fully successful operation.** If an upload fails (network drop, MinIO error), the handler throws before reaching `emitUsage`. No event is written, no charge occurs.

---

## Step 2 — Storage Is Measured Differently

Storage (data at rest) is **not** tracked via `UsageEvent.bytes`. It is read live from the `Object` table:

```js
prisma.object.aggregate({ where: { tenantId }, _sum: { size: true } })
```

Every uploaded file is an `Object` row with a `size` column. The total of all those sizes is your current storage. When you delete a file, the row is deleted and storage drops immediately.

This means storage cost reflects what you have right now — not what you uploaded this month.

---

## Step 3 — The Cost Formula

Defined in `billing/routes.js`, used for the real-time estimate:

```js
const GB = 1024 * 1024 * 1024;

const storageGb   = Number(storageBytes) / GB;
const downloadGb  = Number(downloadBytes) / GB;

const storageCost  = Math.max(0, storageGb  - 5)      * 50;
const uploadCost   = uploadGb                          * 30;
const downloadCost = Math.max(0, downloadGb - 1)      * 20;
const requestCost  = Math.max(0, requestCount - 10000) / 1000 * 500;

const total = storageCost + downloadCost + requestCost;
```

Free tiers are subtracted before multiplying. You are never charged below zero.

**Example — a tenant with:**
- 12 GB stored
- 8 GB downloaded this month
- 50,000 API requests this month

```
storage:   (12 - 5)  GB × $50  = $350.00
upload:    3 GB        × $30  = $90.00
download:  (8  - 1)  GB × $20  = $140.00
requests:  (50,000 - 10,000) / 1,000 × $500 = $20.00

total = $600.00
```

---

## Step 4 — What the Billing Estimate Endpoint Does

`GET /api/billing/estimate` is called by the Billing page in the dashboard. It:

1. Finds the start of the current calendar month (`new Date(year, month, 1)`)
2. Aggregates all `UsageEvent` rows for this tenant since that date
3. Reads current storage from the `Object` table
4. Applies the cost formula above
5. Caches the result for 2 minutes (so rapid page refreshes don't hammer the DB)

This is a **live estimate**, not a committed charge. Nothing is deducted from anywhere.

---

## Step 5 — Invoices

The `Invoice` table exists in the schema with fields: `period`, `status`, `subtotal`, `total`, `lineItems`, `dueAt`, `paidAt`.

**Currently, invoices are read-only via the API** (`GET /api/billing/invoices`). There is no backend job that automatically generates them at month end — invoice creation would need to be triggered manually or via a cron job outside the app. The table and the API are ready; the scheduler is not yet wired up.

---

## Step 6 — Per-Tenant Pricing Overrides

Admins can set a `pricingOverride` JSON field on any tenant row. This is stored on the `Tenant` model:

```prisma
pricingOverride Json?
```

The admin panel lets you set custom pricing for a specific tenant (e.g. a negotiated enterprise rate). The billing estimate endpoint does not currently read this field — it always uses the global rates. The override field is stored for future use when the billing engine is extended to apply it.

---

## Step 7 — Historical Usage (`UsageAggregate`)

The Analytics page history charts read from `UsageAggregate`, not from raw `UsageEvent` rows. Each row is one month of pre-rolled-up totals per tenant:

```prisma
model UsageAggregate {
  tenantId     String
  period       String   // e.g. "2025-04"
  storageBytes BigInt
  uploadBytes  BigInt
  downloadBytes BigInt
  requestCount BigInt
  objectCount  BigInt
}
```

These are populated separately (not by the request path). For new accounts they start empty, which is why the Analytics history shows blank until there is at least one month of data.

---

## Rate Limits (Separate From Billing)

Rate limits are a **traffic control** mechanism, not a billing one. Each tenant has:

- `rateLimitMax` — max requests allowed per window (default: 1,000)
- `rateLimitWindow` — window size in seconds (default: 60)

Counters live in Redis (`rl:tenant:<id>`), reset automatically when the TTL expires. Hitting the rate limit returns HTTP 429 — no usage event is written for blocked requests, so they are not counted or charged.

---

## What Is Not Charged

| Operation | Reason |
|---|---|
| Upload failure (network drop) | Server buffers full body first; disconnect causes buffer loop to throw, `emitUsage` never called |
| Failed uploads | Handler throws before `emitUsage` is reached |
| Partial uploads (network drop mid-transfer) | Server buffers the full body first; a disconnect causes the buffer loop to throw, `emitUsage` never called |
| Presigned URL generation | Recorded as `presign_upload` / `presign_download` with 0 bytes; counts as one API request |
| Rate-limited requests | Blocked at middleware, never reach storage logic |

---

## Summary Flow

```
User action
    │
    ▼
Storage route handler
    │
    ├─ MinIO putObject / getObject  ──── fails? → throw, no event written
    │
    ├─ Prisma Object upsert / delete
    │
    └─ emitUsage() → UsageEvent row written
                          │
                          ▼
              GET /api/billing/estimate
                          │
                    aggregate UsageEvents (this month)
                  + aggregate Object sizes (right now)
                          │
                    apply free tier deductions
                          │
                    return { storageCost, downloadCost, requestCost, total }
```

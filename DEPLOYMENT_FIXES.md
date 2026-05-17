# Deployment Fixes — StorageCloud

A record of every issue encountered during the first production deployment and exactly how each was resolved.

---

## Overview

The original project was built for local development only. Deploying it to Render exposed a series of problems — environment config, Docker architecture, port routing, and missing external services. All are now resolved.

**Final deployment:** https://zcs-bfm3.onrender.com
**Platform:** Render (free tier)
**Database:** Neon (hosted PostgreSQL)
**Cache:** Upstash (hosted Redis)
**File storage:** MinIO (pending — see remaining issues below)

---

## Issue 1 — Separate `backend/.env` and `frontend/.env.local` broke deployment

### What was wrong
Each service had its own env file in its own directory. This caused:
- Environment variables duplicated across two files — easy to get out of sync
- `NEXT_PUBLIC_API_URL` was defined in `backend/.env` but Next.js couldn't read it from there
- Docker build had no consistent source of truth for env vars
- Deployment platforms expected one env file, not two scattered ones

### What we changed
- Created a single root `.env` at the project root — one file for everything
- Updated `backend/src/config/index.js` to load `../../../.env` (three levels up from `backend/src/config/`)
- Updated `frontend/next.config.mjs` to load `../.env` (one level up from `frontend/`)
- Updated `docker-compose.yml` to use `env_file: .env` pointing at root
- Added `dotenv` as a dependency to `frontend/package.json` (required for `next.config.mjs` to call `loadEnv()`)
- Deleted `backend/.env` and `frontend/.env.local`
- Created `.env.example` with all variables documented

### Why dotenv silently ignoring missing files is safe
`dotenv`'s `config()` never overwrites existing `process.env` variables and silently ignores a missing file. So in Docker, where Render/docker-compose already injects the vars, calling `loadEnv()` is a safe no-op.

---

## Issue 2 — `NEXT_PUBLIC_API_URL` undefined at build time in Docker

### What was wrong
Next.js bakes `NEXT_PUBLIC_*` variables into the JavaScript bundle at **build time**, not runtime. The original setup only passed these as runtime `environment:` vars in docker-compose — which means the built JS always had `undefined` for the API URL.

### What we changed
- Added `ARG NEXT_PUBLIC_API_URL` + `ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL` to `frontend/Dockerfile` (before `RUN npm run build`)
- Added `build.args` to both `docker-compose.yml` and `docker-compose.prod.yml` to pass the value at build time
- The runtime `environment:` entry was kept too, for Next.js server-side rewrites

---

## Issue 3 — Separate frontend and backend Dockerfiles required manual multi-service setup

### What was wrong
The original setup had `backend/Dockerfile` and `frontend/Dockerfile` as completely separate images. Deploying on Render meant creating and managing three separate services (backend, frontend, postgres) and wiring them together manually. Each service needed its own env vars, ports, and health checks.

### What we changed
- Created a single root `Dockerfile` that builds both frontend and backend into one container
- Used multi-stage build: Stage 1 builds Next.js (standalone output), Stage 2 sets up the final image
- Added `nginx` + `supervisord` to the final image to run three processes:
  - **nginx** — listens on `$PORT`, routes `/api/*` → backend, `/*` → frontend
  - **backend** — Fastify on internal port 4000 (`BACKEND_PORT`)
  - **frontend** — Next.js standalone on internal port 3000
- Created `nginx-app.conf`, `supervisord.conf`, `entrypoint.sh` at project root
- Updated `docker-compose.yml` to use one `app` service instead of separate `backend` + `frontend` services
- Old `backend/Dockerfile` and `frontend/Dockerfile` kept for reference but no longer used in production

---

## Issue 4 — `DATABASE_URL` in docker-compose overrode the Neon URL from `.env`

### What was wrong
`docker-compose.yml` had an explicit `environment: DATABASE_URL: postgresql://...@postgres:5432/...` block. In docker-compose, `environment:` takes precedence over `env_file:`. So even after putting the Neon connection string in `.env`, the app kept connecting to the local postgres container — not Neon.

All uploaded data appeared in the dashboard (local postgres worked) but nothing appeared in the hosted Neon database.

### What we changed
- Removed `DATABASE_URL` from the `environment:` block in `docker-compose.yml`
- `DATABASE_URL` now comes exclusively from `env_file: .env`, which holds the Neon URL
- Also removed the `postgres: condition: service_healthy` dependency from the `app` service since we're no longer using local postgres

---

## Issue 5 — `NEXT_PUBLIC_API_URL` pointing to wrong port — "failed to fetch" on all API calls

### What was wrong
All API calls in the frontend go through `src/lib/api.js` which does:
```js
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
fetch(`${API_URL}${path}`)
```
This runs in the **browser**. The URL is baked at build time. The original value was `http://localhost:4000` but:
- Port 4000 is the backend inside the container — never exposed externally
- The only externally exposed port was `3000` (nginx → 80 internally)

The browser was trying to call `http://localhost:4000/api/...` which is unreachable.

### What we changed
- Changed `NEXT_PUBLIC_API_URL` in `.env` to `http://localhost:3000`
- This makes the browser call `http://localhost:3000/api/...` → nginx → backend internally
- Forced a `--no-cache` rebuild to bust the cached frontend bundle with the old URL baked in

---

## Issue 6 — Render routed traffic to backend (port 4000) instead of nginx

### What was wrong
Render routes external traffic to the port specified by the `PORT` environment variable. The `.env` had `PORT=4000` (the backend port). So Render sent all traffic directly to the Fastify backend, bypassing nginx entirely. Visiting the deployed URL returned raw Fastify JSON (`{"message":"Route GET:/demo not found"...}`).

Setting `PORT=80` in Render's environment panel didn't fully fix it either — the backend also reads `PORT` to decide what port to listen on, causing a conflict when both nginx and the backend tried to use the same port.

### What we changed
- Renamed the backend's port variable from `PORT` to `BACKEND_PORT` in `config/index.js`
- Backend now always listens on `BACKEND_PORT` (default: 4000), never on `PORT`
- `PORT` is now exclusively for nginx (and Render's routing)
- Made nginx listen dynamically on `${PORT}` using `envsubst` in `entrypoint.sh`
- `nginx-app.conf` uses `listen ${PORT};` as a template placeholder
- `entrypoint.sh` runs `envsubst '${PORT}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf` before starting supervisord
- Added `gettext` (provides `envsubst`) to the Dockerfile `apk add` line
- Changed `COPY nginx-app.conf` destination to `/etc/nginx/nginx.conf.template`
- Changed `EXPOSE` from `80` to `10000` (Render's default PORT)
- Removed `PORT=80` from Render env vars — let Render set it automatically

---

## Issue 7 — Redis placeholder URL caused crash loop

### What was wrong
The `.env` was committed/deployed with the literal placeholder string:
```
REDIS_URL="redis://default:PASSWORD@HOST:PORT"
```
Node.js tried to parse this as a real URL, got `ENOTFOUND host` (it literally tried to DNS-resolve the word "host"), and Redis kept retrying in a loop — flooding the logs.

### What we changed
- Updated `backend/src/config/index.js` to read `REDIS_URL` as a first-class config value
- Updated `backend/src/shared/redis.js` to use `new Redis(url, options)` when `REDIS_URL` is set, falling back to `host/port/password` for local dev
- Added the real Upstash Redis URL (`rediss://default:TOKEN@host.upstash.io:6379`) to Render's environment variables

Note: Upstash provides two connection styles — REST (UPSTASH_REDIS_REST_URL + token) and TCP (REDIS_URL). We use `ioredis` which requires the TCP URL. The TCP URL uses `rediss://` (double-s for SSL) and the password is the same as the REST token.

---

## What Still Remains (Known Issues)

### MinIO / File Storage — not connected in production
**Status:** App continues to run without it. File upload/download endpoints will fail.

**Why:** Render doesn't support running MinIO as a sidecar. Self-hosted MinIO requires a persistent VPS.

**Fix options (pick one):**
1. **Backblaze B2** — 10GB free, no credit card, S3-compatible (zero code changes needed)
   ```
   MINIO_ENDPOINT=s3.us-west-004.backblazeb2.com
   MINIO_PORT=443
   MINIO_USE_SSL=true
   MINIO_ACCESS_KEY=your-b2-key-id
   MINIO_SECRET_KEY=your-b2-app-key
   ```
2. **Cloudflare R2** — requires credit card on file, then free 10GB/month
3. **AWS S3** — reliable but costs money past the free tier

### Seed runs on every deploy
**Status:** Harmless but noisy. The seed script runs on every container start.

**Fix:** Add a check in `prisma/seed.js` to skip if data already exists (e.g., check if admin account already has a row before inserting).

### No custom domain / HTTPS enforcement
**Status:** Running on `https://zcs-bfm3.onrender.com` with Render's TLS.

**Fix:** Add a custom domain in Render → Custom Domains → and update `CORS_ORIGINS` + `NEXT_PUBLIC_API_URL` accordingly.

### JWT secrets are placeholder values
**Status:** `JWT_SECRET=change-me-in-production` is in `.env`. Works but insecure.

**Fix:** Generate two long random strings and set them in Render's environment:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## Environment Variables Reference (Production)

Set these in Render's Environment panel:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Neon connection string with `?sslmode=require` |
| `REDIS_URL` | `rediss://default:TOKEN@host.upstash.io:6379` |
| `JWT_SECRET` | Long random string (min 64 chars) |
| `JWT_REFRESH_SECRET` | Different long random string |
| `JWT_EXPIRES_IN` | `7d` |
| `JWT_REFRESH_EXPIRES_IN` | `30d` |
| `NODE_ENV` | `production` |
| `CORS_ORIGINS` | `https://zcs-bfm3.onrender.com` |
| `NEXT_PUBLIC_API_URL` | `https://zcs-bfm3.onrender.com` |
| `MINIO_ENDPOINT` | Your B2/R2/S3 endpoint |
| `MINIO_PORT` | `443` |
| `MINIO_USE_SSL` | `true` |
| `MINIO_ACCESS_KEY` | Your storage access key |
| `MINIO_SECRET_KEY` | Your storage secret key |
| `MINIO_DEFAULT_BUCKET` | `storagecloud` |
| `BACKEND_PORT` | `4000` |

Do NOT set `PORT` — let Render set it automatically.

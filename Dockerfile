# ── Stage 1: Build Next.js frontend ────────────────────────────────────────────
FROM node:20-alpine AS frontend-builder

WORKDIR /frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ .

# Baked in at build time — pass via docker-compose build.args or --build-arg
ARG NEXT_PUBLIC_API_URL=http://localhost
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build

# ── Stage 2: Single app container (backend + frontend + nginx) ──────────────────
FROM node:20-alpine

RUN apk add --no-cache nginx supervisor openssl

WORKDIR /app

# ── Backend ─────────────────────────────────────────────────────────────────────
COPY backend/package*.json ./
RUN npm ci
COPY backend/ .
RUN npx prisma generate

# ── Frontend standalone bundle ───────────────────────────────────────────────────
COPY --from=frontend-builder /frontend/.next/standalone ./frontend/
COPY --from=frontend-builder /frontend/.next/static ./frontend/.next/static
COPY --from=frontend-builder /frontend/public ./frontend/public

# ── Config files ─────────────────────────────────────────────────────────────────
COPY nginx-app.conf /etc/nginx/nginx.conf
COPY supervisord.conf /etc/supervisord.conf
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Single exposed port — nginx routes /api/* → backend:4000, /* → frontend:3000
EXPOSE 80

ENTRYPOINT ["/entrypoint.sh"]

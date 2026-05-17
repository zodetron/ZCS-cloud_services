#!/bin/sh
set -e

# Default PORT to 80 if not set (local dev / docker-compose)
export PORT=${PORT:-80}

echo "==> Waiting for PostgreSQL to be ready..."
until npx prisma db push --skip-generate --accept-data-loss > /dev/null 2>&1; do
  echo "    Database not ready, retrying in 3s..."
  sleep 3
done

echo "==> Schema applied."

echo "==> Seeding database..."
node prisma/seed.js 2>&1 || echo "    Seed skipped (already applied)."

echo "==> Configuring nginx on port ${PORT}..."
envsubst '${PORT}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

echo "==> Starting backend, frontend, and nginx..."
exec /usr/bin/supervisord -c /etc/supervisord.conf

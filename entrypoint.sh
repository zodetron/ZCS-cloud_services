#!/bin/sh
set -e

echo "==> Waiting for PostgreSQL to be ready..."
until npx prisma db push --skip-generate --accept-data-loss > /dev/null 2>&1; do
  echo "    Database not ready, retrying in 3s..."
  sleep 3
done

echo "==> Schema applied."

echo "==> Seeding database..."
node prisma/seed.js 2>&1 || echo "    Seed skipped (already applied)."

echo "==> Starting backend, frontend, and nginx..."
exec /usr/bin/supervisord -c /etc/supervisord.conf

#!/bin/sh
set -e

echo "==> Waiting for PostgreSQL to be ready..."
until npx prisma db push --skip-generate --accept-data-loss 2>&1 | grep -v "Error\|error"; do
  echo "    Database not ready yet, retrying in 3s..."
  sleep 3
done

echo "==> Applying schema..."
npx prisma db push --skip-generate --accept-data-loss

echo "==> Seeding database..."
node prisma/seed.js 2>&1 || echo "    Seed already applied or skipped."

echo "==> Starting StorageCloud API..."
exec node src/index.js

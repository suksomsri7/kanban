#!/bin/sh
set -e

echo "=== Kanban Docker Entrypoint ==="

echo "Pushing database schema..."
npx prisma db push --skip-generate --accept-data-loss

if [ "$SEED_DB" = "true" ]; then
  echo "Seeding database..."
  npx tsx prisma/seed.ts
fi

echo "Starting Next.js server..."
exec "$@"

#!/bin/sh
set -e
# Railway-friendly entrypoint: Railway injects DATABASE_URL / REDIS_* as env vars,
# so no hardcoded hosts or wait-for-it needed. docker-compose is local-dev only.
npx prisma migrate deploy && \
node -r tsconfig-paths/register dist/src/main.js

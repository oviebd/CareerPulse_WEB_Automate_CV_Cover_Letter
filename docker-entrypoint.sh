#!/bin/sh
set -eu

UPLOAD_ROOT="${UPLOAD_DIR:-/data/uploads}"
mkdir -p "$UPLOAD_ROOT"

if [ "$(id -u)" = "0" ]; then
  chown -R nextjs:nodejs "$UPLOAD_ROOT" || true
fi

if [ "${SKIP_DB_MIGRATE:-}" != "true" ]; then
  echo "Running database migrations..."
  if [ "$(id -u)" = "0" ]; then
    gosu nextjs node /app/scripts/migrate-runtime.mjs
  else
    node /app/scripts/migrate-runtime.mjs
  fi
fi

if [ "$(id -u)" = "0" ]; then
  exec gosu nextjs node server.js
fi

exec node server.js

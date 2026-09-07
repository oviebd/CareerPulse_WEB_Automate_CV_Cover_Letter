#!/bin/sh
# Pull-only production start. Run on the VPS from CI.
# Does not build images. Does not delete volumes.
set -eu

APP_DIR="${APP_DIR:-/opt/careerpulse}"
cd "$APP_DIR"

if [ -z "${CAREERPULSE_IMAGE:-}" ]; then
  echo "CAREERPULSE_IMAGE is required"
  exit 1
fi

if [ ! -f .env.prod ]; then
  echo "Missing $APP_DIR/.env.prod — create it from .env.prod.example before deploying."
  exit 1
fi

if [ -n "${GHCR_TOKEN:-}" ] && [ -n "${GHCR_USER:-}" ]; then
  printf '%s' "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin
fi

printf 'CAREERPULSE_IMAGE=%s\n' "$CAREERPULSE_IMAGE" > .env.deploy

docker compose --env-file .env.prod --env-file .env.deploy pull
docker compose --env-file .env.prod --env-file .env.deploy up -d --remove-orphans

docker compose --env-file .env.prod --env-file .env.deploy ps

echo "Waiting for liveness..."
i=0
while [ "$i" -lt 30 ]; do
  if docker compose --env-file .env.prod --env-file .env.deploy exec -T app \
    node -e "fetch('http://127.0.0.1:3000/api/health/live').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"; then
    echo "Liveness check passed."
    docker image prune -f >/dev/null 2>&1 || true
    exit 0
  fi
  i=$((i + 1))
  sleep 3
done

echo "Liveness check failed."
docker compose --env-file .env.prod --env-file .env.deploy logs --tail=80 app
exit 1

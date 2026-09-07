#!/usr/bin/env sh
set -eu
BACKUP_DIR="${BACKUP_DIR:-./backups}"
STAMP="$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
docker exec careerpulse-db pg_dump -U "${POSTGRES_USER:-careerpulse}" "${POSTGRES_DB:-careerpulse}" \
  | gzip > "$BACKUP_DIR/careerpulse_${STAMP}.sql.gz"
echo "Backup written to $BACKUP_DIR/careerpulse_${STAMP}.sql.gz"

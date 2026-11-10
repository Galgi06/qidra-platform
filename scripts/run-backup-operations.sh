#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-daily}"
APP_DIR="${2:-$(pwd)}"
ENV_FILE="${ENV_FILE:-$APP_DIR/.env.production}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
BACKUP_DIR="${BACKUP_DIR:-$APP_DIR/backups/postgres}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

cd "$APP_DIR"

extract_env_value() {
  local key="$1"
  local value
  value="$(sed -n "s/^${key}=//p" "$ENV_FILE" | tail -1)"
  value="${value%$'\r'}"
  if [[ "$value" == \"*\" && "$value" == *\" ]]; then value="${value:1:${#value}-2}"; fi
  if [[ "$value" == \'*\' && "$value" == *\' ]]; then value="${value:1:${#value}-2}"; fi
  printf '%s' "$value"
}

database_url="${DATABASE_URL:-$(extract_env_value DATABASE_URL)}"
: "${database_url:?DATABASE_URL is required}"
export DATABASE_URL="$database_url"
database_url_no_scheme="${database_url#*://}"
credentials="${database_url_no_scheme%%@*}"
export POSTGRES_USER="${POSTGRES_USER:-${credentials%%:*}}"
export POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-${credentials#*:}}"
database_name_query="${database_url_no_scheme#*/}"
export POSTGRES_DB="${POSTGRES_DB:-${database_name_query%%\?*}}"

case "$MODE" in
  daily)
    BACKUP_DIR="$BACKUP_DIR" \
    BACKUP_POSTGRES_COMPOSE=true \
    BACKUP_UPLOAD_S3=true \
    COMPOSE_FILE="$COMPOSE_FILE" \
    ENV_FILE="$ENV_FILE" \
    RETENTION_DAYS="$RETENTION_DAYS" \
    bash scripts/backup-postgres.sh

    latest_backup="$(find "$BACKUP_DIR" -maxdepth 1 -type f -name 'qidra-postgres-*.dump.gz' -print | sort | tail -1)"
    test -n "$latest_backup"
    test -s "$latest_backup.sha256"
    sha256sum --check "$latest_backup.sha256"
    docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" run --rm -v "$BACKUP_DIR:/backups:ro" migrate node scripts/verify-backup-s3.mjs "/backups/$(basename "$latest_backup")"
    docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" run --rm migrate node scripts/backup-files-s3.mjs
    ;;
  restore-drill)
    ENV_FILE="$ENV_FILE" COMPOSE_FILE="$COMPOSE_FILE" bash scripts/restore-drill.sh "$APP_DIR"
    ;;
  *)
    echo "Usage: scripts/run-backup-operations.sh daily|restore-drill [app-dir]" >&2
    exit 2
    ;;
esac

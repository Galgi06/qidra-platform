#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${1:-$(pwd)}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-$APP_DIR/.env.production}"
RESTORE_DIR="${RESTORE_DIR:-$APP_DIR/backups/restore-drill}"
RESTORE_DATABASE="qidra_restore_drill_$(date -u +%Y%m%d%H%M%S)"

cd "$APP_DIR"
mkdir -p "$RESTORE_DIR"
chmod 700 "$RESTORE_DIR"

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

cleanup() {
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T postgres dropdb --if-exists -U "$POSTGRES_USER" "$RESTORE_DATABASE" >/dev/null 2>&1 || true
  find "$RESTORE_DIR" -maxdepth 1 -type f -delete
}
trap cleanup EXIT

download_output="$(docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" run --rm \
  -v "$RESTORE_DIR:/restore" \
  -v "$APP_DIR/scripts/download-latest-backup-s3.mjs:/app/scripts/download-latest-backup-s3.mjs:ro" \
  migrate node scripts/download-latest-backup-s3.mjs /restore)"
backup_file="$RESTORE_DIR/$(basename "$(printf '%s\n' "$download_output" | tail -1)")"
test -s "$backup_file"
test -s "$backup_file.sha256"
expected_checksum="$(awk 'NR==1 {print $1}' "$backup_file.sha256")"
actual_checksum="$(sha256sum "$backup_file" | awk '{print $1}')"
[[ "$expected_checksum" == "$actual_checksum" ]]

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T postgres createdb -U "$POSTGRES_USER" "$RESTORE_DATABASE"
gunzip -c "$backup_file" | docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T postgres pg_restore --no-owner --no-privileges -U "$POSTGRES_USER" -d "$RESTORE_DATABASE"

counts="$(docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T postgres psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$RESTORE_DATABASE" -Atc \
  'select (select count(*) from "User"), (select count(*) from "Project"), (select count(*) from "SupportThread"), (select count(*) from "_prisma_migrations" where finished_at is not null);')"

IFS='|' read -r users projects threads migrations <<< "$counts"
if [[ -z "$users" || -z "$projects" || -z "$threads" || -z "$migrations" || "$migrations" -lt 1 ]]; then
  echo "Restore drill verification failed." >&2
  exit 1
fi

echo "Restore drill passed: users=$users projects=$projects support_threads=$threads migrations=$migrations"

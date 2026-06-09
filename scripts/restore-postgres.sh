#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?Set DATABASE_URL to the target PostgreSQL connection string}"
BACKUP_FILE="${1:?Usage: scripts/restore-postgres.sh /path/to/qidra-postgres-*.dump.gz}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
POSTGRES_SERVICE="${POSTGRES_SERVICE:-postgres}"
RESTORE_POSTGRES_COMPOSE="${RESTORE_POSTGRES_COMPOSE:-false}"

normalize_pg_url() {
  local url="$1"
  local base query cleaned param

  if [[ "$url" != *\?* ]]; then
    printf "%s" "$url"
    return
  fi

  base="${url%%\?*}"
  query="${url#*\?}"
  cleaned=""

  IFS="&" read -ra params <<< "$query"
  for param in "${params[@]}"; do
    case "$param" in
      schema=*) ;;
      *) cleaned="${cleaned:+$cleaned&}$param" ;;
    esac
  done

  if [[ -n "$cleaned" ]]; then
    printf "%s?%s" "$base" "$cleaned"
  else
    printf "%s" "$base"
  fi
}

pg_url_user() {
  local url="$1"
  local rest auth

  rest="${url#*://}"
  auth="${rest%@*}"
  printf "%s" "${auth%%:*}"
}

pg_url_database() {
  local url="$1"
  local without_query

  without_query="${url%%\?*}"
  printf "%s" "${without_query##*/}"
}

if [[ -f "$BACKUP_FILE.sha256" ]]; then
  sha256sum --check "$BACKUP_FILE.sha256"
fi

tmp_file="$(mktemp)"
trap 'rm -f "$tmp_file"' EXIT

if [[ "$RESTORE_POSTGRES_COMPOSE" == "true" ]]; then
  COMPOSE_POSTGRES_USER="${POSTGRES_USER:-$(pg_url_user "$DATABASE_URL")}"
  COMPOSE_POSTGRES_DB="${POSTGRES_DB:-$(pg_url_database "$DATABASE_URL")}"
  gunzip -c "$BACKUP_FILE" | docker compose -f "$COMPOSE_FILE" exec -T "$POSTGRES_SERVICE" pg_restore --clean --if-exists --no-owner --no-privileges -U "$COMPOSE_POSTGRES_USER" -d "$COMPOSE_POSTGRES_DB"
else
  gunzip -c "$BACKUP_FILE" > "$tmp_file"
  PG_DATABASE_URL="$(normalize_pg_url "$DATABASE_URL")"
  pg_restore --clean --if-exists --no-owner --no-privileges --dbname="$PG_DATABASE_URL" "$tmp_file"
fi

echo "Restore completed from: $BACKUP_FILE"

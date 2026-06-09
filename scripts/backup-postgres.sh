#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?Set DATABASE_URL to the production PostgreSQL connection string}"
BACKUP_DIR="${BACKUP_DIR:-./backups/postgres}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
POSTGRES_SERVICE="${POSTGRES_SERVICE:-postgres}"
BACKUP_POSTGRES_COMPOSE="${BACKUP_POSTGRES_COMPOSE:-false}"
BACKUP_UPLOAD_S3="${BACKUP_UPLOAD_S3:-false}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="$BACKUP_DIR/qidra-postgres-$TIMESTAMP.dump"

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

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

if [[ "$BACKUP_POSTGRES_COMPOSE" == "true" ]]; then
  COMPOSE_POSTGRES_USER="${POSTGRES_USER:-$(pg_url_user "$DATABASE_URL")}"
  COMPOSE_POSTGRES_DB="${POSTGRES_DB:-$(pg_url_database "$DATABASE_URL")}"
  docker compose -f "$COMPOSE_FILE" exec -T "$POSTGRES_SERVICE" pg_dump --format=custom --no-owner --no-privileges -U "$COMPOSE_POSTGRES_USER" -d "$COMPOSE_POSTGRES_DB" | gzip -9 > "$OUT.gz"
else
  PG_DATABASE_URL="$(normalize_pg_url "$DATABASE_URL")"
  pg_dump --format=custom --no-owner --no-privileges --dbname="$PG_DATABASE_URL" --file="$OUT"
  gzip -9 "$OUT"
fi

sha256sum "$OUT.gz" > "$OUT.gz.sha256"
find "$BACKUP_DIR" -type f \( -name 'qidra-postgres-*.dump.gz' -o -name 'qidra-postgres-*.dump.gz.sha256' \) -mtime +"$RETENTION_DAYS" -delete

if [[ "$BACKUP_UPLOAD_S3" == "true" ]]; then
  if [[ "$BACKUP_POSTGRES_COMPOSE" == "true" ]]; then
    docker compose -f "$COMPOSE_FILE" run --rm -v "$BACKUP_DIR:/backups" migrate node scripts/upload-backup-s3.mjs "/backups/$(basename "$OUT.gz")"
  else
    node scripts/upload-backup-s3.mjs "$OUT.gz"
  fi
fi

echo "Backup written: $OUT.gz"
echo "Checksum written: $OUT.gz.sha256"

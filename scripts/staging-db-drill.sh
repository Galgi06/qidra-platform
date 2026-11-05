#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.staging.yml}"
DATABASE_URL="${TEST_DATABASE_URL:-postgresql://qidra:qidra_staging_only@127.0.0.1:55432/qidra_staging?schema=public}"
BACKUP_DIR="${BACKUP_DIR:-.backups/staging}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_FILE="$BACKUP_DIR/qidra-staging-$TIMESTAMP.dump"
RESTORE_DATABASE="qidra_restore_test"

if [[ "$DATABASE_URL" != *"staging"* && "$DATABASE_URL" != *"test"* ]]; then
  echo "Refusing to run staging drill against a database URL without staging/test in its name." >&2
  exit 1
fi

cleanup() {
  docker compose -f "$COMPOSE_FILE" stop postgres >/dev/null
}
trap cleanup EXIT

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

docker compose -f "$COMPOSE_FILE" up -d --wait postgres

export DATABASE_URL
export TEST_DATABASE_URL="$DATABASE_URL"
npx prisma migrate deploy
node --test tests/financial-concurrency.integration.mjs

docker compose -f "$COMPOSE_FILE" exec -T postgres \
  pg_dump --format=custom --no-owner --no-privileges -U qidra -d qidra_staging > "$BACKUP_FILE"

if command -v sha256sum >/dev/null 2>&1; then
  sha256sum "$BACKUP_FILE" > "$BACKUP_FILE.sha256"
  sha256sum --check "$BACKUP_FILE.sha256"
else
  shasum -a 256 "$BACKUP_FILE" > "$BACKUP_FILE.sha256"
  shasum -a 256 --check "$BACKUP_FILE.sha256"
fi

docker compose -f "$COMPOSE_FILE" exec -T postgres \
  psql -U qidra -d postgres -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS $RESTORE_DATABASE WITH (FORCE)"
docker compose -f "$COMPOSE_FILE" exec -T postgres \
  psql -U qidra -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE $RESTORE_DATABASE"
docker compose -f "$COMPOSE_FILE" exec -T postgres \
  pg_restore --no-owner --no-privileges -U qidra -d "$RESTORE_DATABASE" < "$BACKUP_FILE"

TABLE_COUNT="$(docker compose -f "$COMPOSE_FILE" exec -T postgres psql -U qidra -d "$RESTORE_DATABASE" -Atc "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'")"
MIGRATION_COUNT="$(docker compose -f "$COMPOSE_FILE" exec -T postgres psql -U qidra -d "$RESTORE_DATABASE" -Atc 'SELECT count(*) FROM "_prisma_migrations" WHERE finished_at IS NOT NULL')"

if [[ "$TABLE_COUNT" -lt 1 || "$MIGRATION_COUNT" -lt 1 ]]; then
  echo "Restore verification failed: tables=$TABLE_COUNT migrations=$MIGRATION_COUNT" >&2
  exit 1
fi

docker compose -f "$COMPOSE_FILE" exec -T postgres \
  psql -U qidra -d postgres -v ON_ERROR_STOP=1 -c "DROP DATABASE $RESTORE_DATABASE WITH (FORCE)"

echo "Staging database drill passed."
echo "Backup: $BACKUP_FILE"
echo "Checksum: $BACKUP_FILE.sha256"
echo "Restored tables: $TABLE_COUNT"
echo "Applied migrations: $MIGRATION_COUNT"

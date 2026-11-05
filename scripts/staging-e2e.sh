#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.staging.yml}"
DATABASE_URL="${TEST_DATABASE_URL:-postgresql://qidra:qidra_staging_only@127.0.0.1:55432/qidra_staging?schema=public}"
E2E_BASE_URL="${E2E_BASE_URL:-http://127.0.0.1:8092}"
MAILPIT_API_URL="${MAILPIT_API_URL:-http://127.0.0.1:58025}"
LOG_DIR="${LOG_DIR:-.backups/staging}"
APP_LOG="$LOG_DIR/e2e-app.log"
APP_PID=""

if [[ "$DATABASE_URL" != *"staging"* && "$DATABASE_URL" != *"test"* ]]; then
  echo "Refusing to run E2E against a database URL without staging/test in its name." >&2
  exit 1
fi

cleanup() {
  if [[ -n "$APP_PID" ]] && kill -0 "$APP_PID" >/dev/null 2>&1; then
    kill "$APP_PID"
    wait "$APP_PID" 2>/dev/null || true
  fi
  docker compose -f "$COMPOSE_FILE" stop postgres mailpit >/dev/null
}
trap cleanup EXIT

mkdir -p "$LOG_DIR"
docker compose -f "$COMPOSE_FILE" up -d --wait postgres mailpit

export DATABASE_URL
export TEST_DATABASE_URL="$DATABASE_URL"
export E2E_BASE_URL
export MAILPIT_API_URL
export NEXTAUTH_URL="$E2E_BASE_URL"
export QIDRA_PUBLIC_BASE_URL="$E2E_BASE_URL"
export NEXTAUTH_SECRET="qidra-staging-e2e-secret-at-least-32-characters"
export EMAIL_PROVIDER="smtp"
export SMTP_HOST="127.0.0.1"
export SMTP_PORT="51025"
export SMTP_SECURE="false"
export SMTP_FROM="Qidra Staging <no-reply@qidra.invalid>"
export FILE_STORAGE_DRIVER="local"

npx prisma migrate deploy
npx next dev --port 8092 >"$APP_LOG" 2>&1 &
APP_PID=$!

for _ in {1..60}; do
  if curl --fail --silent --show-error "$E2E_BASE_URL/api/auth/csrf" >/dev/null; then
    break
  fi
  if ! kill -0 "$APP_PID" >/dev/null 2>&1; then
    cat "$APP_LOG" >&2
    exit 1
  fi
  sleep 1
done

if ! curl --fail --silent --show-error "$E2E_BASE_URL/api/auth/csrf" >/dev/null; then
  cat "$APP_LOG" >&2
  echo "E2E application did not become ready." >&2
  exit 1
fi

node --test tests/platform-journey.e2e.mjs

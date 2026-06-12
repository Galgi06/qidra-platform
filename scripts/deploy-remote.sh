#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${1:-/opt/qidra-platform}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
RUN_MIGRATIONS="${QIDRA_DEPLOY_RUN_MIGRATIONS:-true}"
WAIT_SECONDS="${QIDRA_DEPLOY_WAIT_SECONDS:-180}"
LOCAL_HEALTHCHECK_URL="${QIDRA_LOCAL_HEALTHCHECK_URL:-http://127.0.0.1:8091/}"

cd "$APP_DIR"

if [[ ! -f "$COMPOSE_FILE" ]]; then
  echo "Compose file not found: $APP_DIR/$COMPOSE_FILE" >&2
  exit 1
fi

if [[ ! -f .env.production ]]; then
  echo "Missing $APP_DIR/.env.production" >&2
  exit 1
fi

echo "Deploying Qidra from $APP_DIR"
if [[ -f .deploy-revision ]]; then
  echo "Revision: $(cat .deploy-revision)"
fi

docker compose -f "$COMPOSE_FILE" up -d postgres

if [[ "$RUN_MIGRATIONS" == "true" ]]; then
  docker compose -f "$COMPOSE_FILE" run --rm migrate
fi

docker compose -f "$COMPOSE_FILE" up -d --build app

deadline=$((SECONDS + WAIT_SECONDS))
until curl -fsS "$LOCAL_HEALTHCHECK_URL" >/dev/null; do
  if (( SECONDS >= deadline )); then
    echo "Application did not become healthy at $LOCAL_HEALTHCHECK_URL" >&2
    docker compose -f "$COMPOSE_FILE" ps
    docker compose -f "$COMPOSE_FILE" logs --tail=200 app
    exit 1
  fi
  sleep 5
done

docker compose -f "$COMPOSE_FILE" ps

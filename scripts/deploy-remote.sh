#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${1:-/opt/qidra-platform}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${QIDRA_DEPLOY_ENV_FILE:-.env.production}"
RUN_MIGRATIONS="${QIDRA_DEPLOY_RUN_MIGRATIONS:-true}"
WAIT_SECONDS="${QIDRA_DEPLOY_WAIT_SECONDS:-180}"
LOCAL_HEALTHCHECK_URL="${QIDRA_LOCAL_HEALTHCHECK_URL:-http://127.0.0.1:8091/}"

cd "$APP_DIR"

if [[ ! -f "$COMPOSE_FILE" ]]; then
  echo "Compose file not found: $APP_DIR/$COMPOSE_FILE" >&2
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $APP_DIR/$ENV_FILE" >&2
  exit 1
fi

echo "Deploying Qidra from $APP_DIR"
if [[ -f .deploy-revision ]]; then
  echo "Revision: $(cat .deploy-revision)"
fi

compose_args=(--env-file "$ENV_FILE" -f "$COMPOSE_FILE")
run_without_local_postgres=false

if ! grep -Eq '^[[:space:]]*POSTGRES_PASSWORD=' "$ENV_FILE"; then
  export POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-unused-external-db}"
  run_without_local_postgres=true
  echo "POSTGRES_PASSWORD is not set in $ENV_FILE; deploying against external DATABASE_URL without local postgres service."
else
  docker compose "${compose_args[@]}" up -d postgres
fi

if [[ "$RUN_MIGRATIONS" == "true" ]]; then
  if [[ "$run_without_local_postgres" == "true" ]]; then
    docker compose "${compose_args[@]}" run --rm --no-deps migrate
  else
    docker compose "${compose_args[@]}" run --rm migrate
  fi
fi

if [[ "$run_without_local_postgres" == "true" ]]; then
  docker compose "${compose_args[@]}" up -d --build --no-deps app
else
  docker compose "${compose_args[@]}" up -d --build app
fi

deadline=$((SECONDS + WAIT_SECONDS))
until curl -fsS "$LOCAL_HEALTHCHECK_URL" >/dev/null; do
  if (( SECONDS >= deadline )); then
    echo "Application did not become healthy at $LOCAL_HEALTHCHECK_URL" >&2
    docker compose "${compose_args[@]}" ps
    docker compose "${compose_args[@]}" logs --tail=200 app
    exit 1
  fi
  sleep 5
done

docker compose "${compose_args[@]}" ps

#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${1:-/opt/qidra-platform}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${QIDRA_DEPLOY_ENV_FILE:-.env.production}"
RUN_MIGRATIONS="${QIDRA_DEPLOY_RUN_MIGRATIONS:-true}"
WAIT_SECONDS="${QIDRA_DEPLOY_WAIT_SECONDS:-180}"
LOCAL_HEALTHCHECK_URL="${QIDRA_LOCAL_HEALTHCHECK_URL:-http://127.0.0.1:8091/}"

extract_env_value() {
  local key="$1"
  local file="$2"
  local line

  line="$(grep -E "^[[:space:]]*${key}=" "$file" | tail -1 || true)"
  line="${line#*=}"
  line="${line#\"}"
  line="${line%\"}"
  printf '%s\n' "$line"
}

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
database_url="$(extract_env_value "DATABASE_URL" "$ENV_FILE")"
database_host=""

if [[ -n "$database_url" ]]; then
  database_url_no_scheme="${database_url#*://}"
  database_url_authority="${database_url_no_scheme%%/*}"
  database_host_port="${database_url_authority#*@}"
  database_host="${database_host_port%%[:?]*}"
fi

if grep -Eq '^[[:space:]]*POSTGRES_PASSWORD=' "$ENV_FILE"; then
  docker compose "${compose_args[@]}" up -d postgres
elif [[ "$database_host" == "postgres" ]]; then
  credentials="${database_url_no_scheme%%@*}"
  if [[ "$credentials" == "$database_url_no_scheme" || "$credentials" != *:* ]]; then
    echo "DATABASE_URL in $ENV_FILE does not contain postgres credentials required to bootstrap local postgres." >&2
    exit 1
  fi

  export POSTGRES_USER="${POSTGRES_USER:-${credentials%%:*}}"
  export POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-${credentials#*:}}"
  database_name_query="${database_url_no_scheme#*/}"
  database_name="${database_name_query%%\?*}"
  export POSTGRES_DB="${POSTGRES_DB:-${database_name}}"

  echo "POSTGRES_PASSWORD is not set in $ENV_FILE; derived local postgres settings from DATABASE_URL for compose bootstrap."
  docker compose "${compose_args[@]}" up -d postgres
else
  export POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-unused-external-db}"
  run_without_local_postgres=true
  echo "POSTGRES_PASSWORD is not set in $ENV_FILE; deploying against external DATABASE_URL without local postgres service."
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

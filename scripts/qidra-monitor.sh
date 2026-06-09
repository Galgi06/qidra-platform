#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${QIDRA_BASE_URL:-https://qidra.io}"
PROJECT_DIR="${QIDRA_PROJECT_DIR:-/opt/qidra-platform}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/qidra/postgres}"
MAX_BACKUP_AGE_HOURS="${MAX_BACKUP_AGE_HOURS:-30}"
MAX_DISK_USAGE_PERCENT="${MAX_DISK_USAGE_PERCENT:-85}"
CERT_MIN_DAYS="${CERT_MIN_DAYS:-14}"

failures=()

check_http() {
  local path="$1"
  local code

  code="$(curl -o /dev/null -s -w "%{http_code}" "${BASE_URL%/}${path}")"
  if [[ "$code" -lt 200 || "$code" -ge 400 ]]; then
    failures+=("HTTP ${path} returned ${code}")
  fi
}

check_http "/"
check_http "/auth/sign-in"
check_http "/projects"

cd "$PROJECT_DIR"
if ! docker compose -f docker-compose.prod.yml ps --status running --format json | grep -q '"Service":"app"'; then
  failures+=("app container is not running")
fi

if ! docker compose -f docker-compose.prod.yml ps --status running --format json | grep -q '"Service":"postgres"'; then
  failures+=("postgres container is not running")
fi

disk_usage="$(df -P / | awk 'NR==2 {gsub("%", "", $5); print $5}')"
if [[ "$disk_usage" -ge "$MAX_DISK_USAGE_PERCENT" ]]; then
  failures+=("root disk usage is ${disk_usage}%")
fi

latest_backup="$(ls -t "$BACKUP_DIR"/qidra-postgres-*.dump.gz 2>/dev/null | head -1 || true)"
if [[ -z "$latest_backup" ]]; then
  failures+=("no PostgreSQL backup found")
else
  now="$(date +%s)"
  modified="$(stat -c %Y "$latest_backup")"
  age_hours="$(((now - modified) / 3600))"

  if [[ "$age_hours" -gt "$MAX_BACKUP_AGE_HOURS" ]]; then
    failures+=("latest PostgreSQL backup is ${age_hours}h old")
  fi

  if [[ -f "$latest_backup.sha256" ]]; then
    if ! sha256sum --check "$latest_backup.sha256" >/dev/null; then
      failures+=("latest PostgreSQL backup checksum failed")
    fi
  else
    failures+=("latest PostgreSQL backup checksum is missing")
  fi
fi

if ! openssl s_client -servername qidra.io -connect qidra.io:443 </dev/null 2>/dev/null | openssl x509 -checkend "$((CERT_MIN_DAYS * 86400))" -noout >/dev/null; then
  failures+=("TLS certificate expires within ${CERT_MIN_DAYS} days")
fi

if ! systemctl is-active --quiet qidra-wallet-sync.timer; then
  failures+=("qidra-wallet-sync.timer is not active")
fi

if (( ${#failures[@]} )); then
  printf "Qidra monitor failed:\n" >&2
  printf -- "- %s\n" "${failures[@]}" >&2
  exit 1
fi

echo "Qidra monitor passed."

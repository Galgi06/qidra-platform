#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${1:-.env.production}"
CLIENT_ID="${GOOGLE_CLIENT_ID:-}"
CLIENT_SECRET="${GOOGLE_CLIENT_SECRET:-}"

if [[ ! "$CLIENT_ID" =~ ^[0-9]+-[A-Za-z0-9]+\.apps\.googleusercontent\.com$ ]]; then
  echo "GOOGLE_CLIENT_ID is missing or invalid" >&2
  exit 1
fi

if [[ ! "$CLIENT_SECRET" =~ ^GOCSPX-[A-Za-z0-9_-]{20,}$ ]]; then
  echo "GOOGLE_CLIENT_SECRET is missing or invalid" >&2
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Environment file not found: $ENV_FILE" >&2
  exit 1
fi

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_file="${ENV_FILE}.before-google-oauth-${timestamp}"
temporary_file="$(mktemp "${ENV_FILE}.tmp-google-oauth.XXXXXX")"
trap 'rm -f "$temporary_file"' EXIT

if file_mode="$(stat -c '%a' "$ENV_FILE" 2>/dev/null)"; then
  :
else
  file_mode="$(stat -f '%Lp' "$ENV_FILE")"
fi

cp "$ENV_FILE" "$backup_file"
chmod 600 "$backup_file"

awk -v client_id="$CLIENT_ID" -v client_secret="$CLIENT_SECRET" '
  BEGIN {
    id_written = 0
    secret_written = 0
  }
  /^GOOGLE_CLIENT_ID=/ {
    if (!id_written) {
      print "GOOGLE_CLIENT_ID=\"" client_id "\""
      id_written = 1
    }
    next
  }
  /^GOOGLE_CLIENT_SECRET=/ {
    if (!secret_written) {
      print "GOOGLE_CLIENT_SECRET=\"" client_secret "\""
      secret_written = 1
    }
    next
  }
  { print }
  END {
    if (!id_written) print "GOOGLE_CLIENT_ID=\"" client_id "\""
    if (!secret_written) print "GOOGLE_CLIENT_SECRET=\"" client_secret "\""
  }
' "$ENV_FILE" > "$temporary_file"

chmod "$file_mode" "$temporary_file"
mv "$temporary_file" "$ENV_FILE"
trap - EXIT

echo "Google OAuth configuration updated. Previous environment: $backup_file"

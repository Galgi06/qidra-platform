#!/usr/bin/env bash
set -euo pipefail

: "${QIDRA_BASE_URL:?Set QIDRA_BASE_URL, for example https://qidra.io}"
: "${CRON_SECRET:?Set CRON_SECRET to the production cron bearer token}"
LIMIT_PER_WALLET="${LIMIT_PER_WALLET:-100}"

curl --fail --silent --show-error \
  --request POST \
  --header "Authorization: Bearer ${CRON_SECRET}" \
  "${QIDRA_BASE_URL%/}/api/cron/wallet-deposits?limitPerWallet=${LIMIT_PER_WALLET}"
echo

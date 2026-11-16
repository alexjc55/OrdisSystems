#!/usr/bin/env bash
# Temporary, isolated verification service. Never uses a workspace database.
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
temp="$(mktemp -d /tmp/ordis-recovery-preview.XXXXXX)"
child=""
cleanup() {
  if [[ -n "$child" ]]; then kill "$child" 2>/dev/null || true; wait "$child" 2>/dev/null || true; fi
  pg_ctl -D "$temp/data" -m immediate -w stop >/dev/null 2>&1 || true
  rm -rf "$temp"
}
trap cleanup EXIT INT TERM
initdb -D "$temp/data" -A trust -U recovery --no-locale --encoding=UTF8 >/dev/null
pg_ctl -D "$temp/data" -l "$temp/postgres.log" -o "-h '' -k $temp" -w start >/dev/null
env -i PATH="$PATH" PGHOST="$temp" PGUSER=recovery PGPORT=5432 \
  createdb recovery_preview
env -i PATH="$PATH" PGHOST="$temp" PGUSER=recovery PGPORT=5432 \
  psql -X -q -v ON_ERROR_STOP=1 -1 -d recovery_preview \
  -f "$root/generated-artifacts/edahouse-recovery/edahouse-restored.sql" \
  >"$temp/import.log" 2>&1
tar -xzf "$root/attached_assets/archiveGO7F2.tar_1794827013715.gz" -C "$temp"
cd "$temp"
env -i PATH="$PATH" HOME="$HOME" LANG=C.UTF-8 DOTENV_CONFIG_PATH=/dev/null \
  NODE_ENV=production USE_NEON=false PGHOST="$temp" PGUSER=recovery PGPORT=5432 \
  PGDATABASE=recovery_preview PORT=5018 \
  SESSION_SECRET=isolated-recovery-verification-not-for-production \
  PAYMENT_HYP_ENABLED=false PAYMENT_GROW_ENABLED=false \
  PAYMENT_ALLPAY_ENABLED=false PAYMENT_PAYME_ENABLED=false \
  node "$root/dist/index.js" >"$temp/server.log" 2>&1 &
child=$!
for attempt in $(seq 1 40); do
  if curl --fail --silent http://127.0.0.1:5018/api/products -o /dev/null; then
    echo "Isolated recovered store ready on port 5018"
    wait "$child"
    exit $?
  fi
  if ! kill -0 "$child" 2>/dev/null; then echo "Isolated preview failed; private logs: $temp/server.log"; exit 1; fi
  sleep 1
done
echo "Isolated preview startup timeout"; exit 1

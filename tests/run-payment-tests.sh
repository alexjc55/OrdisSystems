#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
for tool in initdb pg_ctl; do
  command -v "$tool" >/dev/null || { echo "Для тестов нужен PostgreSQL ($tool)." >&2; exit 1; }
done
# Never connect to a store database: use a disposable UTF-8 cluster.
temp="$(mktemp -d /tmp/payment-tests.XXXXXX)"
cleanup() {
  pg_ctl -D "$temp/data" -m immediate stop >/dev/null 2>&1 || true
  rm -rf "$temp"
}
trap cleanup EXIT
initdb -D "$temp/data" -A trust -U payment_test --no-locale --encoding=UTF8 >/dev/null
pg_ctl -D "$temp/data" -l "$temp/postgres.log" -o "-h '' -k $temp" -w start >/dev/null
export PGHOST="$temp" PGPORT=5432 PGUSER=payment_test PGDATABASE=postgres PGPASSWORD=''
export USE_NEON=false DATABASE_URL="postgresql://payment_test@localhost/postgres?host=$temp"
export PAYMENT_TEST_CLUSTER=isolated NODE_ENV=test REPLIT_APP_URL=https://shop.example.test
unset SUPER_ADMIN_LOGIN SUPER_ADMIN_PASSWORD
./node_modules/.bin/drizzle-kit push --force >/dev/null
node --import tsx --test tests/payment-finalization.test.ts tests/payment-order-email.test.ts tests/checkout-order-email.test.ts

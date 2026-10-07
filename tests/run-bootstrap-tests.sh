#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
for tool in initdb pg_ctl; do
  command -v "$tool" >/dev/null || { echo "Для тестов нужен PostgreSQL ($tool)." >&2; exit 1; }
done
# A disposable local cluster. Never use any store/development database or secrets.
temp="$(mktemp -d /tmp/bootstrap-tests.XXXXXX)"
cleanup() {
  pg_ctl -D "$temp/data" -m immediate stop >/dev/null 2>&1 || true
  rm -rf "$temp"
}
trap cleanup EXIT
initdb -D "$temp/data" -A trust -U bootstrap_test --no-locale --encoding=UTF8 >/dev/null
pg_ctl -D "$temp/data" -l "$temp/postgres.log" -o "-h '' -k $temp" -w start >/dev/null
export PGHOST="$temp" PGPORT=5432 PGUSER=bootstrap_test PGDATABASE=postgres PGPASSWORD=''
export USE_NEON=false DATABASE_URL="postgresql://bootstrap_test@localhost/postgres?host=$temp"
export BOOTSTRAP_TEST_CLUSTER=isolated
# Create the actual current schema, not a simplified mock of users.
./node_modules/.bin/drizzle-kit push --force >/dev/null
node --import tsx --test tests/bootstrap-admin.test.ts

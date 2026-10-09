#!/usr/bin/env bash
# Compare the combined upgrade to recent individual migrations, never a store DB.
set -euo pipefail
cd "$(dirname "$0")/.."
for tool in initdb pg_ctl psql pg_dump; do
  command -v "$tool" >/dev/null || { echo "Required: $tool" >&2; exit 1; }
done
temp="$(mktemp -d /tmp/migration-full-tests.XXXXXX)"
cleanup() {
  pg_ctl -D "$temp/data" -m immediate stop >/dev/null 2>&1 || true
  rm -rf "$temp"
}
trap cleanup EXIT
initdb -D "$temp/data" -A trust -U migration_test --no-locale --encoding=UTF8 >/dev/null
pg_ctl -D "$temp/data" -l "$temp/postgres.log" -o "-h '' -k $temp" -w start >/dev/null
unset PGHOSTADDR PGSERVICE PGSERVICEFILE PGDATABASE PGSSLMODE PGREQUIRESSL PGTARGETSESSIONATTRS
export PGHOST="$temp" PGPORT=5432 PGUSER=migration_test PGPASSWORD='' PGOPTIONS=''
psql -X -d postgres -v ON_ERROR_STOP=1 -q \
  -c 'CREATE DATABASE combined;' -c 'CREATE DATABASE separate;'
for db in combined separate; do
  psql -X -d "$db" -v ON_ERROR_STOP=1 -q <<'SQL'
CREATE TABLE products (id serial PRIMARY KEY, name text);
CREATE TABLE orders (id serial PRIMARY KEY, payment_method text, transaction_id text);
CREATE TABLE pending_payments (
  id serial PRIMARY KEY, token text, status text, transaction_id text,
  provider_approval_required boolean, provider_approved_at timestamp
);
INSERT INTO products (name) VALUES ('Тестовый товар');
INSERT INTO orders (payment_method, transaction_id) VALUES
  ('online', 'unique'), ('online', 'ambiguous'), ('online', 'ambiguous');
INSERT INTO pending_payments (token, status, transaction_id, provider_approval_required) VALUES
  ('linked', 'completed', 'unique', true),
  ('ambiguous', 'completed', 'ambiguous', null),
  ('unknown', 'completed', 'missing', null),
  ('unpaid', 'pending', null, null);
SQL
done
psql -X -d separate -v ON_ERROR_STOP=1 -qc \
  'ALTER TABLE products ADD COLUMN min_order_quantity DECIMAL(10,3), ADD COLUMN max_order_quantity DECIMAL(10,3);'
for migration in migrations/0007*.sql migrations/0008*.sql migrations/0009*.sql \
  migrations/0010*.sql migrations/0011*.sql migrations/0012*.sql; do
  psql -X -d separate -v ON_ERROR_STOP=1 --single-transaction -q -f "$migration" >/dev/null
done
for run in 1 2; do
  psql -X -d combined -v ON_ERROR_STOP=1 --single-transaction -q -f migration_full.sql >/dev/null
  psql -X -d combined -v ON_ERROR_STOP=1 -q <<'SQL'
DO $$
BEGIN
  IF (SELECT count(*) FROM products) <> 1 OR
     (SELECT count(*) FROM orders) <> 3 OR
     (SELECT count(*) FROM pending_payments) <> 4 THEN
    RAISE EXCEPTION 'Historical records changed unexpectedly';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pending_payments WHERE token = 'linked' AND order_id = 1
                 AND provider_approval_attempted_at IS NOT NULL) OR
     EXISTS (SELECT 1 FROM pending_payments WHERE token <> 'linked' AND order_id IS NOT NULL) OR
     EXISTS (SELECT 1 FROM pending_payments WHERE verification IS NOT NULL) OR
     EXISTS (SELECT 1 FROM payment_email_outbox) THEN
    RAISE EXCEPTION 'Historical linkage, approval, verification or mail backfill is incorrect';
  END IF;
END $$;
SQL
  # New pg_dump security releases emit random psql guard tokens. These files
  # are only compared, not restored; omit those non-schema lines from the diff.
  pg_dump -d combined --schema-only --no-owner --no-privileges |
    sed '/^\\restrict /d; /^\\unrestrict /d' > "$temp/combined.sql"
  pg_dump -d separate --schema-only --no-owner --no-privileges |
    sed '/^\\restrict /d; /^\\unrestrict /d' > "$temp/separate.sql"
  diff -u "$temp/separate.sql" "$temp/combined.sql"
done
psql -X -d postgres -v ON_ERROR_STOP=1 -qc 'CREATE DATABASE fresh;'
psql -X -d fresh -v ON_ERROR_STOP=1 -q <<'SQL'
CREATE TABLE products (id serial PRIMARY KEY, name text);
CREATE TABLE orders (id serial PRIMARY KEY, payment_method text, transaction_id text);
CREATE TABLE pending_payments (id serial PRIMARY KEY, token text, status text, transaction_id text);
SQL
for run in 1 2; do
  psql -X -d fresh -v ON_ERROR_STOP=1 --single-transaction -q -f migration_full.sql >/dev/null
done
psql -X -d fresh -v ON_ERROR_STOP=1 -qc \
  'SELECT order_id, verification, provider_approval_required, provider_approved_at,
    provider_approval_attempted_at, provider_approval_reference FROM pending_payments LIMIT 0;' >/dev/null
echo "Combined migration matches migrations 0007–0012, including constraints/indexes; repeat application and historical data checks passed."

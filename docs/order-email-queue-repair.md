# Orders fail because the email queue schema is missing

If the server logs `relation "payment_email_outbox" does not exist` or a missing
`checkout_snapshot` column, customer checkout can roll back before an order is
saved. Checkout and automatic email intentions are committed together. This
affects stores without online payments too; it is not only an SMTP delivery issue.
Other errors with the same generic browser message need separate investigation.

## Targeted VPS repair

These commands are for the existing external PostgreSQL VPS configuration
(`USE_NEON=false`, `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`).
They do not use or change Replit's managed databases.

1. Update the repository normally, keeping the store's own `.env` and uploads.
   If Git reports local changes, resolve them deliberately; do not force-reset
   a store to run this repair.
2. From the intended store's project directory, inspect **without changing data**:

   ```sh
   node scripts/repair-order-email-queue.mjs
   ```

3. Check the displayed `database` is the intended store database. Replace
   `CONFIRMED_DATABASE_NAME` below with that exact name:

   ```sh
   node scripts/repair-order-email-queue.mjs --apply --database CONFIRMED_DATABASE_NAME
   ```

The script only applies migrations **0008 and 0010**, in one transaction. A
database-name mismatch, a schema other than public, a missing orders table or
an incompatible queue aborts the repair. Existing orders, customers, products,
credentials and sessions are not changed. It does not generate notifications
for old orders. Repeat application is supported. Connection secrets are not
printed.

An SQL-only repair does not require a rebuild or PM2 restart. If application code
is also updated, follow the store's usual build/restart procedure. Repeat the
read-only inspection afterward: `queue_exists` and `snapshot_is_jsonb` should be
true and `missing_columns` empty. Diagnose a subsequent failed checkout from its
new log rather than applying unrelated migrations blindly.

## Full recent upgrade

`migration_full.sql` combines the recent upgrades for an existing store with
the base payment schema already installed. It is not a new-database installer.
Unlike the targeted repair, it also updates historical payment associations and
approval intent conservatively. Review and back up the intended store before
applying that broader upgrade; do not run it automatically during startup.

`npm run test:migrations` compares this file with migrations 0007–0012 on
disposable PostgreSQL databases, runs it twice, checks historical data, and
exercises the VPS repair command including failure rollback. It never uses a
store database.

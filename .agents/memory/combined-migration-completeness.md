---
name: Combined migration completeness
description: Keeping external-store upgrade SQL in sync and avoiding false schema-diff failures.
---

Update the combined external-store upgrade whenever adding an individual migration. Check columns, constraints, indexes and historical data updates, not just filenames.

**Why:** A new payment-verification migration existed individually but was omitted from the combined SQL the owner planned to apply to existing stores.

**How to apply:** Compare the combined upgrade against the individual migrations on a disposable database; test repeated application and historical record preservation. Do not run this audit against any store database.

Schema-only pg_dump comparisons must ignore generated psql guard tokens, but retain every schema definition.

**Why:** PostgreSQL 16.10 emits random restrict/unrestrict tokens even for equivalent schemas; comparing raw dumps produced a false mismatch.

**How to apply:** Strip only those guard lines in comparison-only dumps. Do not remove guards from backups intended for restoration or normalize away genuine DDL differences.

When adapting a `pg_dump --clean` backup for an empty database, omit its cleanup
preamble rather than ignoring restore errors, but retain both psql guard commands.

**Why:** A clean dump without `--if-exists` fails on missing tables before import.
Keeping only the schema/data tail can also leave `\unrestrict` without its matching
`\restrict`, making an otherwise complete transactional restore fail.

**How to apply:** Leave the original backup untouched. Build a portable copy with
the session SET commands and matched guard pair, then validate a complete restore
and dump roundtrip in a disposable UTF-8 cluster.

Validate fresh schemas against raw SQL writes and automatic side effects too,
not just the ORM's table creation or the first successful API response.

**Why:** Existing stores had manually added translated image columns that were
absent from the declared schema. A freshly saved theme could therefore exist
while its automatic application failed.

**How to apply:** Exercise complete create/apply/edit/reload flows against an
empty, generated schema. Keep fields used by raw SQL in the declared schema
and in the safe cumulative upgrade, preserving existing values.

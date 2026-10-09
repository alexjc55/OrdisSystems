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

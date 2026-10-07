---
name: Initial administrator scope
description: Owner-approved limits on initializing access versus repairing existing store credentials.
---

Initial administrator assignment must not change or repurpose any existing account, even when a store has customers but no administrator. Repair of existing store credentials is separately scoped work, not an automatic startup migration.

**Why:** The owner explicitly required existing accounts to remain untouched and confirmed a separate first-admin command that refuses any nonempty user table.

**How to apply:** Preserve this limit when extending installation, import, deployment or recovery procedures. Do not silently turn an existing customer into an administrator or rotate an existing administrator's password while updating a store.

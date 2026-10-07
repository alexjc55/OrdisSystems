---
name: Session rotation scope
description: Owner-approved limits on password compatibility and session revocation in existing stores.
---

Password fixes must support existing hashes without rewriting accounts on startup. Revoke only the sessions of the account whose password was explicitly changed or reset. Do not mass-delete sessions or migrate existing session tables as part of rollout.

**Why:** The owner maintains multiple existing stores and explicitly limited this work to affected users, with no mass deletion without consent. Schema declarations and deployed session storage can differ; a schema-led migration could affect unrelated sessions.

**How to apply:** Preserve mixed-hash compatibility when updating stores. Treat emergency bulk revocation or session-table migration as separately authorized work with confirmed database scope.

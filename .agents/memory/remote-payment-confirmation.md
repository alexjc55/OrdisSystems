---
name: Remote payment confirmation
description: Limits of local payment approval state during uncertain remote outcomes.
---

Do not claim exactly-once remote confirmation solely from local locks and a saved success marker. A retry must use the same transaction identifier; treating an undocumented provider response as success is not safe.

**Why:** Grow's official documentation checked on 2026-10-07 describes approval as notification acknowledgment, not charging, and explicitly excludes J4/J5. Its documented transactionId/transactionToken request differs from the older transactionCode integration. The reviewed reference does not establish already-approved responses or acknowledgment-status lookup for that older contract. A paid transaction is not proof that Grow received acknowledgment.

**How to apply:** Preserve order and email idempotency independently. Unknown outcomes and historical confirmations must remain blocked from automatic replay until Grow verifies the exact transaction's acknowledgment. Operator verification must concern acknowledgment, not just payment success. Obtain written provider confirmation of the older contract before automatic reconciliation or recognizing “already approved.” Never use acknowledgment as an assumed J5 capture API.

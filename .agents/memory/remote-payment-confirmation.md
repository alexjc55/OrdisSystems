---
name: Remote payment confirmation
description: Limits of local payment approval state during uncertain remote outcomes.
---

Do not claim exactly-once remote confirmation solely from local locks and a saved success marker. A retry must use the same transaction identifier; treating an undocumented provider response as success is not safe.

**Why:** Grow's local integration establishes success only from an explicit status of 1. A connection loss or process death after remote success but before the local commit leaves an uncertain outcome, and the available integration contract does not establish how Grow answers an already-approved retry.

**How to apply:** Preserve order and email idempotency independently. Before adding automatic reconciliation, handling “already approved” as success, or replaying old confirmations, verify Grow's documented same-transaction behavior or retrieve its authoritative transaction status. Do not infer confirmation from a completed order.

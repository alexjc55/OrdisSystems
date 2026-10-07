---
name: Historical paid orders
description: Compatibility rule for older completed payments during payment/order association rollout.
---

Do not recreate a completed payment's order merely because its historical order association is missing. Recover historical associations only when they are unambiguous; otherwise preserve the completed payment without guessing.

**Why:** Stores already had completed payments before payment-to-order associations were recorded. Transaction identifiers are not guaranteed unique across historical records, so guessing can link a buyer to the wrong order or create another order for an already processed payment.

**How to apply:** Keep this compatibility behavior when tightening payment invariants or migrating existing stores. A missing historical association is a reconciliation issue, not permission to finalize again.

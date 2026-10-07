---
name: Checkout price changes
description: Customer-consent boundary when recalculating online checkout prices.
---

Recalculate online checkout from authoritative catalog and promotion data, but reject a mismatch with the amount the buyer submitted rather than silently charging a revised amount.

**Why:** Ignoring the submitted total would block underpayment but could unexpectedly charge more after a catalog or promotion change. The owner requires preserving existing checkout prices and business rules while preventing browser price tampering.

**How to apply:** Treat browser totals as consistency checks only. On a discrepancy, require the buyer to review the cart; do not create a pending payment or contact the gateway until amounts agree. Keep guest identity separate from browser-supplied user identifiers.

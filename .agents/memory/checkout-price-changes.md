---
name: Checkout price changes
description: Customer-consent boundary when recalculating checkout prices.
---

Recalculate both online and ordinary customer checkout from authoritative catalog and promotion data, but reject a mismatch with the amount the buyer submitted rather than silently creating an order or charging a revised amount. Do not apply customer checkout pricing to manual administrative orders without a separate decision.

**Why:** Ignoring the submitted total would block underpayment but could unexpectedly charge more or create a more expensive pay-on-delivery order after a catalog or promotion change. The owner requires preserving existing checkout prices and business rules while preventing browser price tampering, and explicitly excludes manual administrative orders.

**How to apply:** Treat browser totals as consistency checks only. On a discrepancy, require the buyer to review the cart; do not create an order, pending payment or email intent, or contact the gateway until amounts agree. Keep guest identity separate from browser-supplied user identifiers. Ordinary orders can legitimately have a zero total after discounts; the online gateway's positive-charge requirement must not prohibit those orders.

Registration during checkout changes loyalty eligibility. Establish the session and show the signed-in checkout total before the buyer confirms an ordinary order or online payment.

**Why:** A guest-priced registration submission becomes stale as soon as registration creates a session. Loyalty may lower the subtotal enough to remove free delivery, so even a new discount can increase the final total.

**How to apply:** Preserve delivery/contact choices and the cart across registration, update the signed-in state immediately, and require a separate confirmation using the displayed updated total. Do not submit from the pre-registration render or clear the cart just because registration succeeded.

---
name: Coupon limits and remote payments
description: Why atomic coupon consumption at finalization does not reserve availability before payment.
---

Do not describe atomic coupon consumption during order finalization as a guarantee that every remotely paid checkout will create an order.

**Why:** A payment provider can accept payment before local finalization acquires the coupon lock. Another checkout can consume the last use in the meantime. Enforcing the limit must not silently change the paid discount or amount; the losing payment remains unresolved rather than producing an extra discounted order.

**How to apply:** Treat pre-payment reservations and handling paid-but-unfinalized purchases as separate payment-lifecycle work. Reservation expiry must account for late payment notifications; releasing a reservation merely because a browser returns an error is unsafe without authoritative payment evidence.

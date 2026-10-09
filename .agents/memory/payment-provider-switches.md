---
name: Payment provider switches
description: Compatibility and financial boundaries of per-store environment switches.
---

Provider availability switches govern new online-payment initiation, not the
validity or processing of payments already initiated.

**Why:** Each store is independently updated. Disabling a storefront option must
not strand a payment already authorized by a buyer or discard the merchant
configuration needed to verify its notification.

**How to apply:** Keep historical provider resolution, verified callbacks,
reconciliation and existing-payment operations available. Preserve saved
configuration when controls are hidden or unrelated store settings are saved.
Do not centralize new-checkout gating in a provider resolver also used for
historical payments.

Omitted switches default to enabled.

**Why:** Updating code must not silently disable existing stores whose server
environment predates the new switches.

**How to apply:** Require an explicit false value to disable a provider; reject
invalid boolean values instead of treating them as an implicit default.

---
name: Quantity-limit compatibility
description: Preserve existing merchant quantity settings when strengthening checkout validation.
---

Preserve the established editor/storefront interpretation of order limits, not historical comments claiming weighted limits are kilograms. Do not convert existing merchant data to fit a newly introduced server assumption.

**Why:** On dk, the established editor saved 550 grams as 5.5 hundred-gram units. Reading this as kilograms made checkout demand ten times the intended amount and made cart refresh remove valid products. A stored maximum of zero also historically meant no restriction, not zero permitted quantity.

**How to apply:** Validate weighted limits against the actual editor and storefront contract before changing checkout checks. Use the same interpretation in checkout and recovery, cover ordinary guest/authenticated and online paths, and retain rejection of genuinely out-of-range quantities. This compatibility repair requires code changes, not a bulk data migration.

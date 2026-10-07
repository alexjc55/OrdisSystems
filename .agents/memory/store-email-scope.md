---
name: Existing store mail settings
description: Owner's scope for mail features across independently configured stores.
---

Use the existing store-specific mail mechanism for new transactional emails. The owner states that order emails already work for customers and administrators, and mail is configured for every store, including this workspace's store.

**Why:** The owner explicitly rejected treating password recovery as a new email-service setup.

**How to apply:** Reuse each store's current mail transport and sender settings. Do not propose replacing the provider or reconnecting mail merely to add another email type. Keep store URLs separate from SMTP settings: an email service being configured does not establish a trusted website origin.

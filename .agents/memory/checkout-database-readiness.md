---
name: Checkout database readiness
description: Why mail-worker warnings require checking the actual checkout database.
---

Treat an unavailable transactional email queue as a possible checkout-readiness
failure, not merely a background email-delivery warning. This applies even when
online payments are disabled.

**Why:** The store can save orders and durable notification intentions atomically.
A missing queue schema therefore prevents the order itself from committing.
Successful tests against a freshly prepared disposable database do not prove
that an independently deployed store's database received its required upgrades.

**How to apply:** Check the schema in the actual configured application database
after schema-dependent changes. Distinguish SMTP delivery failures from missing
database objects. Keep target confirmation and explicit migrations separate from
code updates; do not work around missing schema by silently dropping mail
intentions or replaying historical notifications.

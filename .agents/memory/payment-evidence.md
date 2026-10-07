---
name: Payment evidence and compatibility
description: Authentication boundary for payment notifications and safe cutover of unverifiable older sessions.
---

Do not treat a browser-visible payment token, success flag, transaction code or
return URL as evidence of payment. Prefer the provider's authenticated lookup
or signed notification, and bind the exact merchant, amount and transaction.

**Why:** Official contracts differ from older integrations: HYP Amount is ILS;
Grow's current lookup uses private process/transaction pairs; PayMe seller MPL
alone does not supply the Partner credentials required by its lookup/signature.
Inventing equivalent proofs silently reintroduces forged-payment acceptance.

**How to apply:** Where existing merchant credentials cannot verify a notification
independently, an individual server-only notification URL can authenticate new
sessions without changing customer redirects. Never leak its secret to a browser
or equate it with an independent payment-status query. Older sessions without
proof need a drained cutover or provider reconciliation, not token-only fallback.
See `docs/payment-notification-verification.md` for contracts and installation.

Authentication capabilities in callback/notification URLs must be sent only to
an operator-configured trusted HTTPS origin, never a request-supplied host.

**Why:** Source authentication is ineffective if an attacker can choose where
the provider sends its secret. Host/Origin/forwarded-header spoofing can turn an
otherwise private notification credential into an attacker-owned credential.

**How to apply:** Use the existing trusted-origin policy for credential-bearing
URLs, validate it before creating a payment, and test forged Host and forwarded
headers for both current and legacy initiation routes.

Do not rotate merchant keys automatically or overwrite older stores' configuration.

**Why:** Binding evidence to merchant credentials means a key/account change can
invalidate legitimate in-flight notifications.

**How to apply:** Coordinate rotation with the owner and provider, especially
after removing publicly exposed signing credentials. Preserve completed orders;
reconcile ambiguous payments separately.

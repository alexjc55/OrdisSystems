# Grow acknowledgment: uncertain outcomes

## Official contract checked 2026-10-07

- https://developers.grow.business/reference/approve-transaction says approval
  acknowledges receipt of the server notification. It **does not alter payment
  status** or charge/cancel the transaction. Grow can resend notifications up to
  five times when acknowledgments are absent. It explicitly excludes J4/J5 and
  token transactions.
- https://developers.grow.business/reference/approve-transaction-1 and
  https://developers.grow.business/reference/approve-transaction-2 document
  `pageCode`, `transactionId`, `transactionToken` and notification fields.
- The documented request differs from this integration's older
  `userId/apiKey/transactionCode` request. The reviewed official reference,
  collection landing page and documentation search did not establish an
  already-acknowledged response for this older request or an acknowledgment
  status lookup. Do not invent an endpoint or treat a paid transaction as proof
  of acknowledgment. Written confirmation from Grow is still needed before
  automatic reconciliation/retry can be enabled.

## Deployment

Apply `migrations/0011_payment_approval_reconciliation.sql` to each store before
deploying this code, after migration 0009. Stop old server processes first:
mixed versions could still replay acknowledgments. This migration is additive
and repeatable; it protects already-completed approval-required rows without
calling Grow, creating orders or enqueueing mail. Never broad-push the schema
or bulk replay historical transactions.

## Runtime behavior

New non-J5 Grow payments commit an attempt timestamp and exact transaction code
before any network request. Only numeric `1` or string `"1"` marks success.
Timeouts, unknown codes (including an unverified “already approved” response),
malformed responses, process death and local commit failures retain unknown
state. Repeated notifications return 500 until a success marker exists; no
second gateway call is sent. A concurrent notification can temporarily return
500 while the single request is still in progress; a later notification returns
200 once success is committed.

Legacy rows with no initiation-mode snapshot require manual verification.
J5 rows with a saved `false` requirement do not enter this acknowledgment flow.
Order creation and its email intents remain separately idempotent; reconciliation
does not create, resend, drain or reset those intents.

## Verify one unknown payment

1. Identify one payment in the correct store/database. Check its saved
   transaction code, order, initiation mode and attempt/success timestamps.
2. Ask Grow to confirm **acknowledgment received**, for that exact transaction
   and business, and confirm it is **not J5**. “Paid” alone is not sufficient.
   Obtain a non-sensitive Grow support/case reference. If Grow reports rejection,
   cannot confirm, or identifies J5, leave it unknown. This tool cannot authorize
   another request or manufacture a success.
3. Only after that verification, using the store's existing database environment:

   ```sh
   node --import tsx scripts/reconcile-grow-approval.ts \
     --token PAYMENT_TOKEN \
     --transaction-code EXACT_GROW_CODE \
     --grow-confirmation-reference GROW-CASE-123 \
     --verified-non-j5-acknowledged
   ```

The script trusts the server operator's verification; it is **not** a Grow API
lookup. It has no public HTTP route, accepts exactly one payment, validates the
saved transaction code and completed state, rejects saved J5 mode and records
the confirmation reference atomically. An absent historical transaction code
can be supplied only after verifying its association with Grow. It never calls
the gateway or creates orders/mail. Repeat execution is harmless.

There is deliberately no automatic scan, historical backfill of success, or
retry after unknown/rejected outcomes. Grow must clarify the older API contract
before those operations can safely be implemented.

# Server-authoritative payment checkout

Both `/api/payment/initiate` and `/api/payment/hyp/initiate` recalculate the
checkout before writing a pending payment or contacting a payment gateway.
This change needs no additional database migration.

Only product IDs, quantities, delivery/contact fields, coupon code, gift
consent and a branch selection are accepted as checkout choices. User identity
comes from the authenticated session. Product prices, special offers, volume
tiers, loyalty, coupon eligibility, gift configuration and delivery settings
come from the store database.

The server and cart share the product-price calculation: quantities for `100g`
and `100ml` are grams/ml, `kg` quantities are kilograms, and each line rounds up
to 10 agorot. Quantity limits for grams/ml products remain expressed in kg/litre.
Volume discounts are applied first. Loyalty and coupon stacking keep the existing
rules; free delivery uses the subtotal after discounts. A product marked unavailable
today can be ordered for a later delivery date, but not for today. Branch-specific
availability is enforced when branches are enabled.

Browser `totalAmount` is a consistency check, not a source of price. The nested
`orderData.totalAmount` is also checked when supplied; current checkout forms
may omit it. A mismatch returns HTTP 409 with `code: CART_PRICE_CHANGED`, without
creating a pending payment or calling the gateway. The customer must review the
cart rather than being silently redirected to pay a changed amount.

The pending-payment order snapshot, item totals and the gateway amount all come
from the same server quote. Browser-supplied discounts, delivery fee, status and
user IDs cannot override that snapshot.

Checks:

- `npm run test:payment-quote`: pricing rules and tampered inputs, no database.
- `npm run test:payments`: real routes and persistence in a disposable PostgreSQL
  database, with external gateways replaced by test doubles.
- `npm run check` and `npm run check:vps`: type contracts and external-server build.

This protection is for online payment initiation. Ordinary non-online order
routes still need separate hardening of their item-price and delivery inputs.

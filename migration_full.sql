-- Cumulative upgrade for an existing store with the base payment schema
-- (migrations 0000–0006). Not a fresh-install schema.
-- Apply transactionally with ON_ERROR_STOP; do not backfill historical emails.

CREATE TABLE IF NOT EXISTS payment_email_outbox (
  id serial PRIMARY KEY,
  order_id integer NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  audience varchar NOT NULL CHECK (audience IN ('admin', 'guest')),
  recipient text NOT NULL,
  status varchar NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  attempts integer NOT NULL DEFAULT 0,
  available_at timestamp NOT NULL DEFAULT now(),
  created_at timestamp NOT NULL DEFAULT now(),
  sent_at timestamp,
  last_error text,
  CONSTRAINT payment_email_outbox_order_audience_key UNIQUE (order_id, audience)
);
CREATE INDEX IF NOT EXISTS payment_email_outbox_due_idx
  ON payment_email_outbox(status, available_at);

-- Ordinary checkout notifications share the durable order email queue.
-- Existing NULL snapshots retain the paid-order delivery path.
ALTER TABLE payment_email_outbox
  ADD COLUMN IF NOT EXISTS checkout_snapshot jsonb;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS min_order_quantity DECIMAL(10,3),
  ADD COLUMN IF NOT EXISTS max_order_quantity DECIMAL(10,3);

-- Link only unambiguous historical completed payments; preserve other payments.
ALTER TABLE pending_payments
  ADD COLUMN IF NOT EXISTS order_id INTEGER UNIQUE REFERENCES orders(id) ON DELETE SET NULL;

UPDATE pending_payments AS p
SET order_id = o.id
FROM orders AS o
WHERE p.status = 'completed'
  AND p.order_id IS NULL
  AND p.transaction_id IS NOT NULL
  AND o.payment_method = 'online'
  AND o.transaction_id = p.transaction_id
  AND (SELECT COUNT(*) FROM orders WHERE transaction_id = p.transaction_id AND payment_method = 'online') = 1
  AND (SELECT COUNT(*) FROM pending_payments WHERE transaction_id = p.transaction_id) = 1
  AND NOT EXISTS (SELECT 1 FROM pending_payments WHERE order_id = o.id);

ALTER TABLE pending_payments
  ADD COLUMN IF NOT EXISTS provider_approval_required boolean,
  ADD COLUMN IF NOT EXISTS provider_approved_at timestamp;

ALTER TABLE pending_payments
  ADD COLUMN IF NOT EXISTS provider_approval_attempted_at timestamp,
  ADD COLUMN IF NOT EXISTS provider_approval_reference varchar(255);

-- Unknown historical approval outcomes must not be retried as new charges.
UPDATE pending_payments
SET provider_approval_attempted_at = CURRENT_TIMESTAMP
WHERE status = 'completed'
  AND provider_approval_required = true
  AND provider_approved_at IS NULL
  AND provider_approval_attempted_at IS NULL;

-- Never invent verification evidence for historical payments.
ALTER TABLE pending_payments
  ADD COLUMN IF NOT EXISTS verification jsonb;

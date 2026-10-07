-- Apply before deploying the payment finalization code. Additive only: no
-- orders or payments are removed. Safe to re-run on independently hosted stores.
ALTER TABLE pending_payments
  ADD COLUMN IF NOT EXISTS order_id INTEGER UNIQUE REFERENCES orders(id) ON DELETE SET NULL;

-- Recover only unambiguous historical links. Unknown/ambiguous completed
-- payments stay completed with a null link and must never be recreated.
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

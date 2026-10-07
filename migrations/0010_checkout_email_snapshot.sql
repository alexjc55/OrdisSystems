-- Additive and safe to rerun. NULL keeps existing paid-order delivery unchanged.
ALTER TABLE payment_email_outbox
  ADD COLUMN IF NOT EXISTS checkout_snapshot jsonb;

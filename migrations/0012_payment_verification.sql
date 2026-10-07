-- Additive: do not alter historical paid orders or invent verification evidence.
ALTER TABLE pending_payments ADD COLUMN IF NOT EXISTS verification jsonb;

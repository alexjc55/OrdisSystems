-- Apply before deploying the reconciliation-aware handlers. No history replay.
-- Existing rows keep NULL: a completed order is not evidence of Grow approval.
ALTER TABLE pending_payments
  ADD COLUMN IF NOT EXISTS provider_approval_attempted_at timestamp,
  ADD COLUMN IF NOT EXISTS provider_approval_reference varchar(255);

-- The previous version already saved approval_required=true, but not intent.
-- Protect those completed rows too; true plus missing approved_at is NOT proof
-- that an earlier approve request was never sent. Do not contact Grow here.
UPDATE pending_payments
SET provider_approval_attempted_at = CURRENT_TIMESTAMP
WHERE status = 'completed'
  AND provider_approval_required = true
  AND provider_approved_at IS NULL
  AND provider_approval_attempted_at IS NULL;

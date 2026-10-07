-- Apply before deploying the approval-aware payment handlers.
-- Approval is separate from order finalization. Legacy rows keep NULL:
-- completed does not prove that Grow approval ever succeeded.
ALTER TABLE pending_payments
  ADD COLUMN IF NOT EXISTS provider_approval_required boolean,
  ADD COLUMN IF NOT EXISTS provider_approved_at timestamp;

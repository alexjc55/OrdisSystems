-- Migration: Unified payment provider config
-- Replaces legacy flat HYP columns with a single jsonb field.

-- 1. Add new unified config column
ALTER TABLE "store_settings" ADD COLUMN IF NOT EXISTS "payment_provider_config" jsonb;

-- 2. Backfill from legacy flat fields (if they exist and config is still empty)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'store_settings' AND column_name = 'payment_provider'
  ) THEN
    UPDATE store_settings
    SET payment_provider_config = jsonb_build_object(
      'active', COALESCE(payment_provider, 'none'),
      'hyp', jsonb_build_object(
        'masof',    COALESCE(hyp_masof,  ''),
        'passP',    COALESCE(hyp_pass_p, ''),
        'key',      COALESCE(hyp_key,    ''),
        'testMode', COALESCE(hyp_test_mode, true)
      )
    )
    WHERE payment_provider_config IS NULL
      AND payment_provider IS NOT NULL
      AND payment_provider != 'none';
  END IF;
END $$;

-- 3. Drop legacy flat payment columns
ALTER TABLE "store_settings"
  DROP COLUMN IF EXISTS "payment_provider",
  DROP COLUMN IF EXISTS "hyp_masof",
  DROP COLUMN IF EXISTS "hyp_signature",
  DROP COLUMN IF EXISTS "hyp_key",
  DROP COLUMN IF EXISTS "hyp_pass_p",
  DROP COLUMN IF EXISTS "hyp_test_mode";

-- 4. Rename hyp_transaction_id → transaction_id in pending_payments
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pending_payments' AND column_name = 'hyp_transaction_id'
  ) THEN
    ALTER TABLE "pending_payments" RENAME COLUMN "hyp_transaction_id" TO "transaction_id";
  ELSE
    -- Column already renamed or table is fresh — add if missing
    ALTER TABLE "pending_payments" ADD COLUMN IF NOT EXISTS "transaction_id" varchar(255);
  END IF;
END $$;

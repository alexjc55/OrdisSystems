-- Migration: Add unified paymentProviderConfig jsonb field
-- This replaces the flat hyp_masof / hyp_pass_p / hyp_key / payment_provider fields
-- with a single jsonb column that can hold any payment provider's credentials.
-- Legacy flat columns are kept for backward compatibility but are no longer written to.

ALTER TABLE "store_settings" ADD COLUMN IF NOT EXISTS "payment_provider_config" jsonb;

-- Backfill: migrate existing HYP credentials into the new jsonb structure
UPDATE "store_settings"
SET "payment_provider_config" = jsonb_build_object(
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

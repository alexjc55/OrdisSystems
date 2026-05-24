-- Migration: Add HYP API Key field (new /pay API requires KEY parameter)
-- The old hyp_signature (HMAC key) is replaced by hyp_key (API key) in the new API flow.

ALTER TABLE "store_settings" ADD COLUMN IF NOT EXISTS "hyp_key" varchar(255);

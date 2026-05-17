-- Migration: Coupon improvements
-- 1. stacksWithLoyalty flag (if true, coupon discount stacks with loyalty discount)
-- 2. targetCustomerEmails (jsonb array) — replaces/extends single targetCustomerEmail
-- 3. targetUserIds (jsonb array) — replaces/extends single targetUserId

ALTER TABLE "coupons" ADD COLUMN IF NOT EXISTS "stacks_with_loyalty" boolean NOT NULL DEFAULT false;
ALTER TABLE "coupons" ADD COLUMN IF NOT EXISTS "target_customer_emails" jsonb;
ALTER TABLE "coupons" ADD COLUMN IF NOT EXISTS "target_user_ids" jsonb;

-- Migration: Loyalty System (coupons, volume discounts, loyalty settings)
-- Run after 0000_cheerful_spectrum.sql

-- New table: coupons
CREATE TABLE IF NOT EXISTS "coupons" (
  "id" serial PRIMARY KEY NOT NULL,
  "code" varchar(50) NOT NULL,
  "description" text,
  "discount_type" varchar NOT NULL,
  "discount_value" numeric(10, 2) NOT NULL,
  "min_order_amount" numeric(10, 2) DEFAULT '0',
  "max_uses" integer,
  "current_uses" integer DEFAULT 0 NOT NULL,
  "usage_type" varchar(20) NOT NULL DEFAULT 'multi',
  "scope" varchar(20) NOT NULL DEFAULT 'order',
  "target_customer_email" varchar(255),
  "applicable_product_ids" jsonb,
  "is_active" boolean DEFAULT true NOT NULL,
  "expires_at" timestamp,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  CONSTRAINT "coupons_code_unique" UNIQUE("code")
);

-- Add new coupon columns if table already exists (idempotent)
ALTER TABLE "coupons" ADD COLUMN IF NOT EXISTS "usage_type" varchar(20) NOT NULL DEFAULT 'multi';
ALTER TABLE "coupons" ADD COLUMN IF NOT EXISTS "scope" varchar(20) NOT NULL DEFAULT 'order';
ALTER TABLE "coupons" ADD COLUMN IF NOT EXISTS "target_customer_email" varchar(255);
ALTER TABLE "coupons" ADD COLUMN IF NOT EXISTS "applicable_product_ids" jsonb;

-- New table: coupon_uses
CREATE TABLE IF NOT EXISTS "coupon_uses" (
  "id" serial PRIMARY KEY NOT NULL,
  "coupon_id" integer NOT NULL REFERENCES "coupons"("id"),
  "order_id" integer NOT NULL REFERENCES "orders"("id"),
  "user_id" varchar REFERENCES "users"("id"),
  "used_at" timestamp DEFAULT now()
);

-- New table: product_volume_discounts
CREATE TABLE IF NOT EXISTS "product_volume_discounts" (
  "id" serial PRIMARY KEY NOT NULL,
  "product_id" integer NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
  "min_quantity" numeric(10, 3) NOT NULL,
  "discount_type" varchar NOT NULL,
  "discount_value" numeric(10, 2) NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- New columns on orders table
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "coupon_code" varchar(50);
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "coupon_discount" numeric(10, 2);
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "loyalty_discount" numeric(10, 2);
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "gift_product_id" integer;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "discount_details" jsonb;

-- New columns on store_settings table
ALTER TABLE "store_settings" ADD COLUMN IF NOT EXISTS "loyalty_discount_enabled" boolean DEFAULT false;
ALTER TABLE "store_settings" ADD COLUMN IF NOT EXISTS "loyalty_discount_percent" numeric(5, 2) DEFAULT '0';
ALTER TABLE "store_settings" ADD COLUMN IF NOT EXISTS "gift_enabled" boolean DEFAULT false;
ALTER TABLE "store_settings" ADD COLUMN IF NOT EXISTS "gift_product_id" integer;
ALTER TABLE "store_settings" ADD COLUMN IF NOT EXISTS "gift_min_order_amount" numeric(10, 2) DEFAULT '300';

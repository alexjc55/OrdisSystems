-- ROLLBACK MIGRATION: Remove Barcode System Changes
-- Date: 2025-07-17
-- Description: Safely removes problematic barcode system changes that caused issues on server

BEGIN;

-- Remove multilingual barcode fields that were incorrectly added
-- (These fields don't exist in the Drizzle schema and cause conflicts)
ALTER TABLE products 
DROP COLUMN IF EXISTS barcode_en,
DROP COLUMN IF EXISTS barcode_he,
DROP COLUMN IF EXISTS barcode_ar;

-- Remove indexes for multilingual barcode fields
DROP INDEX IF EXISTS idx_products_barcode_en;
DROP INDEX IF EXISTS idx_products_barcode_he;
DROP INDEX IF EXISTS idx_products_barcode_ar;

-- Remove weight tracking fields from order_items (not in schema)
ALTER TABLE order_items
DROP COLUMN IF EXISTS scanned_weight,
DROP COLUMN IF EXISTS is_weight_scanned,
DROP COLUMN IF EXISTS barcode_used;

-- Remove audit log table (creates unnecessary complexity)
DROP TABLE IF EXISTS barcode_scan_log;

-- Remove barcode_config table (not needed for current system)
DROP TABLE IF EXISTS barcode_config;

-- Keep only the basic barcode field that exists in the schema
-- Reset any modified product data to clean state
UPDATE products 
SET barcode = NULL
WHERE barcode IN ('025874', '025875');

-- Keep the main barcode field and its index as they are properly defined
-- ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode VARCHAR(50); -- Already exists
-- CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode); -- Keep this

COMMIT;
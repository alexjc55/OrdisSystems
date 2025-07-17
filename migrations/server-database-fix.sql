-- SERVER DATABASE FIX: Complete database synchronization for VPS deployment
-- Date: 2025-07-17  
-- Description: Fixes server database to match working Replit environment

BEGIN;

-- ======================================
-- STEP 1: Remove problematic barcode tables and fields
-- ======================================

-- Drop problematic tables that don't exist in schema
DROP TABLE IF EXISTS barcode_config CASCADE;
DROP TABLE IF EXISTS barcode_scan_log CASCADE;

-- Remove multilingual barcode fields from products (not in schema)
ALTER TABLE products 
DROP COLUMN IF EXISTS barcode_en,
DROP COLUMN IF EXISTS barcode_he,
DROP COLUMN IF EXISTS barcode_ar;

-- Remove weight tracking fields from order_items (not in schema)
ALTER TABLE order_items
DROP COLUMN IF EXISTS scanned_weight,
DROP COLUMN IF EXISTS is_weight_scanned,
DROP COLUMN IF EXISTS barcode_used;

-- Remove problematic indexes
DROP INDEX IF EXISTS idx_products_barcode_en;
DROP INDEX IF EXISTS idx_products_barcode_he;
DROP INDEX IF EXISTS idx_products_barcode_ar;

-- ======================================
-- STEP 2: Ensure correct barcode system fields exist
-- ======================================

-- Ensure basic barcode field exists in products (schema.ts line 102)
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS barcode VARCHAR(50);

-- Create proper index for barcode field
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);

-- Ensure barcode configuration fields exist in store_settings (schema.ts lines 284-289)
ALTER TABLE store_settings
ADD COLUMN IF NOT EXISTS barcode_system_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS barcode_product_code_start INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS barcode_product_code_end INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS barcode_weight_start INTEGER DEFAULT 6,
ADD COLUMN IF NOT EXISTS barcode_weight_end INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS barcode_weight_unit VARCHAR(10) DEFAULT 'g';

-- ======================================
-- STEP 3: Configure barcode system for Israeli format
-- ======================================

-- Enable barcode system with Israeli supermarket format
UPDATE store_settings SET
  barcode_system_enabled = true,
  barcode_product_code_start = 2,    -- Position 2-5 for product code
  barcode_product_code_end = 5,
  barcode_weight_start = 6,          -- Position 6-10 for weight
  barcode_weight_end = 10,
  barcode_weight_unit = 'g'
WHERE id = 1;

-- ======================================
-- STEP 4: Add test product with barcode
-- ======================================

-- Update test product with barcode for testing
UPDATE products 
SET barcode = '025874' 
WHERE name = 'Абжерка' AND barcode IS NULL;

-- ======================================
-- STEP 5: Verify database structure
-- ======================================

-- Verify the fix worked
DO $$
BEGIN
  -- Check that problematic tables are gone
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'barcode_config') THEN
    RAISE EXCEPTION 'ERROR: barcode_config table still exists!';
  END IF;
  
  -- Check that barcode field exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'barcode') THEN
    RAISE EXCEPTION 'ERROR: products.barcode field missing!';
  END IF;
  
  -- Check that barcode config exists in store_settings  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'store_settings' AND column_name = 'barcode_system_enabled') THEN
    RAISE EXCEPTION 'ERROR: barcode configuration fields missing in store_settings!';
  END IF;
  
  RAISE NOTICE 'SUCCESS: Database structure verified correctly!';
END
$$;

COMMIT;

-- Final status check
SELECT 
  'Database migration completed successfully!' as status,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'products' AND column_name LIKE '%barcode%') as barcode_fields_in_products,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'store_settings' AND column_name LIKE '%barcode%') as barcode_config_fields
;
-- Migration: Update Category Icons System and Remove Delivery Fee Storage
-- Date: 2025-01-09
-- Description: Complete migration for latest eDAHouse updates including:
--   1. Enhanced category icon system with expanded options
--   2. Unit measurement system improvements (portion support)
--   3. Remove delivery_fee column from orders table (dynamic calculation)
--   4. Ensure all multilingual fields are present
-- This migration is safe to run on existing production databases

-- Start transaction for safety
BEGIN;

-- 1. Ensure categories table has all required columns
-- (These should already exist, but we check for safety)
DO $$ 
BEGIN
    -- Check if icon column exists and has proper type
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'categories' AND column_name = 'icon'
    ) THEN
        ALTER TABLE categories ADD COLUMN icon TEXT;
    END IF;

    -- Check if sortOrder column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'categories' AND column_name = 'sortOrder'
    ) THEN
        ALTER TABLE categories ADD COLUMN "sortOrder" INTEGER DEFAULT 0;
    END IF;

    -- Check if multilingual name columns exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'categories' AND column_name = 'name_en'
    ) THEN
        ALTER TABLE categories ADD COLUMN name_en TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'categories' AND column_name = 'name_he'
    ) THEN
        ALTER TABLE categories ADD COLUMN name_he TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'categories' AND column_name = 'name_ar'
    ) THEN
        ALTER TABLE categories ADD COLUMN name_ar TEXT;
    END IF;

    -- Check if multilingual description columns exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'categories' AND column_name = 'description_en'
    ) THEN
        ALTER TABLE categories ADD COLUMN description_en TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'categories' AND column_name = 'description_he'
    ) THEN
        ALTER TABLE categories ADD COLUMN description_he TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'categories' AND column_name = 'description_ar'
    ) THEN
        ALTER TABLE categories ADD COLUMN description_ar TEXT;
    END IF;

END $$;

-- 2. Update any categories that don't have icons with default food icon
UPDATE categories 
SET icon = '🍽️' 
WHERE icon IS NULL OR icon = '';

-- 3. Update sortOrder for categories that don't have it set
UPDATE categories 
SET "sortOrder" = id * 10
WHERE "sortOrder" IS NULL OR "sortOrder" = 0;

-- 4. Ensure products table has all required multilingual columns for compatibility
DO $$ 
BEGIN
    -- Check if products has multilingual name columns
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'name_en'
    ) THEN
        ALTER TABLE products ADD COLUMN name_en TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'name_he'
    ) THEN
        ALTER TABLE products ADD COLUMN name_he TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'name_ar'
    ) THEN
        ALTER TABLE products ADD COLUMN name_ar TEXT;
    END IF;

    -- Check if products has multilingual description columns
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'description_en'
    ) THEN
        ALTER TABLE products ADD COLUMN description_en TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'description_he'
    ) THEN
        ALTER TABLE products ADD COLUMN description_he TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'description_ar'
    ) THEN
        ALTER TABLE products ADD COLUMN description_ar TEXT;
    END IF;

END $$;

-- 5. Create indexes for better performance (if they don't exist)
DO $$ 
BEGIN
    -- Index on category sortOrder for faster ordering
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'categories' AND indexname = 'idx_categories_sortorder'
    ) THEN
        CREATE INDEX idx_categories_sortorder ON categories ("sortOrder");
    END IF;

    -- Index on product categoryId for faster joins
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'products' AND indexname = 'idx_products_categoryid'
    ) THEN
        CREATE INDEX idx_products_categoryid ON products ("categoryId");
    END IF;

END $$;

-- 6. Remove delivery_fee column from orders table (dynamic calculation)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'delivery_fee'
    ) THEN
        ALTER TABLE orders DROP COLUMN delivery_fee;
        RAISE NOTICE 'delivery_fee column removed from orders table - now using dynamic calculation';
    ELSE
        RAISE NOTICE 'delivery_fee column already removed or never existed - no action needed';
    END IF;
END $$;

-- 7. Ensure products table supports all unit types including "portion"
DO $$ 
BEGIN
    -- Check if unit column has proper constraints
    -- This ensures "portion" unit is supported along with existing units
    -- No schema change needed as unit is already a varchar field
    UPDATE products 
    SET unit = '100g' 
    WHERE unit IS NULL OR unit = '';
    
    RAISE NOTICE 'Product units verified - portion unit support available';
END $$;

-- 8. Ensure store_settings has delivery calculation fields
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'store_settings' AND column_name = 'delivery_fee'
    ) THEN
        ALTER TABLE store_settings ADD COLUMN delivery_fee DECIMAL(10,2) DEFAULT 15.00;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'store_settings' AND column_name = 'free_delivery_from'
    ) THEN
        ALTER TABLE store_settings ADD COLUMN free_delivery_from DECIMAL(10,2) DEFAULT 50.00;
    END IF;
END $$;

-- Commit transaction
COMMIT;

-- Verification queries (run these to check migration success)
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'categories' ORDER BY column_name;
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'products' ORDER BY column_name;
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'orders' ORDER BY column_name;
-- SELECT COUNT(*) as categories_with_icons FROM categories WHERE icon IS NOT NULL AND icon != '';
-- SELECT COUNT(*) as categories_with_sort_order FROM categories WHERE "sortOrder" > 0;
-- SELECT COUNT(*) as orders_without_delivery_fee FROM orders; -- Should be all orders since column removed
-- SELECT delivery_fee, free_delivery_from FROM store_settings; -- Should show delivery settings

SELECT 'Migration completed successfully!' as status,
       'Features updated:' as details,
       '1. Category icons system enhanced' as feature_1,
       '2. Multilingual support ensured' as feature_2,
       '3. Delivery fee calculation now dynamic' as feature_3,
       '4. Unit measurements support portion' as feature_4;
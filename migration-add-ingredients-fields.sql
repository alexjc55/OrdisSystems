-- Migration: Add ingredients fields to products table
-- Date: 2025-01-06
-- Purpose: Add multilingual ingredients support for products

-- Add ingredients columns for all languages
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS ingredients TEXT,
ADD COLUMN IF NOT EXISTS ingredients_en TEXT,
ADD COLUMN IF NOT EXISTS ingredients_he TEXT,
ADD COLUMN IF NOT EXISTS ingredients_ar TEXT;

-- Update any existing NULL values to empty strings for consistency
UPDATE products 
SET 
  ingredients = COALESCE(ingredients, ''),
  ingredients_en = COALESCE(ingredients_en, ''),
  ingredients_he = COALESCE(ingredients_he, ''),
  ingredients_ar = COALESCE(ingredients_ar, '');

-- Create index for ingredients search (optional for performance)
CREATE INDEX IF NOT EXISTS idx_products_ingredients ON products USING gin(to_tsvector('russian', ingredients));
CREATE INDEX IF NOT EXISTS idx_products_ingredients_en ON products USING gin(to_tsvector('english', ingredients_en));

-- Verify the migration
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'products' 
  AND column_name LIKE 'ingredients%'
ORDER BY column_name;

-- Show count of products that will be affected
SELECT 
  COUNT(*) as total_products,
  COUNT(CASE WHEN ingredients IS NOT NULL AND ingredients != '' THEN 1 END) as products_with_ingredients_ru,
  COUNT(CASE WHEN ingredients_en IS NOT NULL AND ingredients_en != '' THEN 1 END) as products_with_ingredients_en,
  COUNT(CASE WHEN ingredients_he IS NOT NULL AND ingredients_he != '' THEN 1 END) as products_with_ingredients_he,
  COUNT(CASE WHEN ingredients_ar IS NOT NULL AND ingredients_ar != '' THEN 1 END) as products_with_ingredients_ar
FROM products;
#!/bin/bash

# Migration script for adding ingredients fields
# Usage: ./apply-migration.sh

echo "🔄 Начинаю миграцию базы данных..."
echo "📋 Добавление полей состава продуктов для всех языков"

# Check if PostgreSQL is available
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL клиент не найден. Установите postgresql-client."
    exit 1
fi

# Database connection parameters
DB_HOST="ordis.co.il"
DB_PORT="5432"
DB_USER="demo_ordis_usr"
DB_NAME="demo_ordis"

echo "🔌 Подключение к базе данных..."
echo "   Хост: $DB_HOST"
echo "   База: $DB_NAME"
echo "   Пользователь: $DB_USER"

# Execute migration
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME << 'EOF'
-- Migration: Add ingredients fields to products table
-- Date: 2025-01-06

\echo 'Starting migration: Add ingredients fields...'

-- Add ingredients columns for all languages
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS ingredients TEXT,
ADD COLUMN IF NOT EXISTS ingredients_en TEXT,
ADD COLUMN IF NOT EXISTS ingredients_he TEXT,
ADD COLUMN IF NOT EXISTS ingredients_ar TEXT;

\echo 'Columns added successfully!'

-- Update any existing NULL values to empty strings for consistency
UPDATE products 
SET 
  ingredients = COALESCE(ingredients, ''),
  ingredients_en = COALESCE(ingredients_en, ''),
  ingredients_he = COALESCE(ingredients_he, ''),
  ingredients_ar = COALESCE(ingredients_ar, '');

\echo 'NULL values updated!'

-- Create index for ingredients search (optional for performance)
CREATE INDEX IF NOT EXISTS idx_products_ingredients ON products USING gin(to_tsvector('russian', ingredients));
CREATE INDEX IF NOT EXISTS idx_products_ingredients_en ON products USING gin(to_tsvector('english', ingredients_en));

\echo 'Indexes created!'

-- Verify the migration
\echo 'Verification:'
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'products' 
  AND column_name LIKE 'ingredients%'
ORDER BY column_name;

-- Show count of products that will be affected
\echo 'Statistics:'
SELECT 
  COUNT(*) as total_products,
  COUNT(CASE WHEN ingredients IS NOT NULL AND ingredients != '' THEN 1 END) as products_with_ingredients_ru,
  COUNT(CASE WHEN ingredients_en IS NOT NULL AND ingredients_en != '' THEN 1 END) as products_with_ingredients_en,
  COUNT(CASE WHEN ingredients_he IS NOT NULL AND ingredients_he != '' THEN 1 END) as products_with_ingredients_he,
  COUNT(CASE WHEN ingredients_ar IS NOT NULL AND ingredients_ar != '' THEN 1 END) as products_with_ingredients_ar
FROM products;

\echo 'Migration completed successfully! ✅'
EOF

if [ $? -eq 0 ]; then
    echo "✅ Миграция завершена успешно!"
    echo "📝 Поля ingredients, ingredients_en, ingredients_he, ingredients_ar добавлены в таблицу products"
else
    echo "❌ Ошибка при выполнении миграции"
    exit 1
fi
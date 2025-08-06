# Быстрые команды для миграции базы данных

## Подключение к базе данных
```bash
psql -h ordis.co.il -p 5432 -U demo_ordis_usr -d demo_ordis
```

## Миграция (скопировать и выполнить в psql)
```sql
-- Добавить поля состава для всех языков
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS ingredients TEXT,
ADD COLUMN IF NOT EXISTS ingredients_en TEXT,
ADD COLUMN IF NOT EXISTS ingredients_he TEXT,
ADD COLUMN IF NOT EXISTS ingredients_ar TEXT;

-- Обновить NULL значения
UPDATE products 
SET 
  ingredients = COALESCE(ingredients, ''),
  ingredients_en = COALESCE(ingredients_en, ''),
  ingredients_he = COALESCE(ingredients_he, ''),
  ingredients_ar = COALESCE(ingredients_ar, '');

-- Создать индексы для поиска
CREATE INDEX IF NOT EXISTS idx_products_ingredients ON products USING gin(to_tsvector('russian', ingredients));
CREATE INDEX IF NOT EXISTS idx_products_ingredients_en ON products USING gin(to_tsvector('english', ingredients_en));
```

## Проверка результата
```sql
-- Проверить новые колонки
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'products' 
  AND column_name LIKE 'ingredients%'
ORDER BY column_name;

-- Статистика продуктов
SELECT 
  COUNT(*) as total_products,
  COUNT(CASE WHEN ingredients IS NOT NULL AND ingredients != '' THEN 1 END) as with_ingredients_ru,
  COUNT(CASE WHEN ingredients_en IS NOT NULL AND ingredients_en != '' THEN 1 END) as with_ingredients_en,
  COUNT(CASE WHEN ingredients_he IS NOT NULL AND ingredients_he != '' THEN 1 END) as with_ingredients_he,
  COUNT(CASE WHEN ingredients_ar IS NOT NULL AND ingredients_ar != '' THEN 1 END) as with_ingredients_ar
FROM products;
```

## Автоматическое выполнение
```bash
# Если есть доступ к серверу, можно выполнить автоматически:
./apply-migration.sh

# Или через файл миграции:
psql -h ordis.co.il -p 5432 -U demo_ordis_usr -d demo_ordis -f migration-add-ingredients-fields.sql
```
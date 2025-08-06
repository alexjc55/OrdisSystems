# Миграция базы данных - Добавление полей состава и слайдера

## Описание
Эта миграция добавляет поля для хранения состава продуктов и изображений слайдера на всех четырех языках (русский, английский, иврит, арабский).

## Инструкция по применению

### 1. Подключение к базе данных на сервере
```bash
# Подключиться к PostgreSQL на удаленном сервере
psql -h PGHOST -p PGPORT -U demo_ordis_usr -d demo_ordis
```

### 2. Применение миграции
```bash
# Выполнить миграцию
\i migration-add-ingredients-fields.sql
```

### 3. Проверка результата
После выполнения миграции вы увидите:
- Подтверждение добавления колонок
- Список всех колонок ingredients*
- Статистику по продуктам с составом

### 4. Альтернативный способ
Если у вас нет доступа к файлу миграции на сервере, можете выполнить команды напрямую:

```sql
-- Добавить колонки состава и слайдера
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS ingredients TEXT,
ADD COLUMN IF NOT EXISTS ingredients_en TEXT,
ADD COLUMN IF NOT EXISTS ingredients_he TEXT,
ADD COLUMN IF NOT EXISTS ingredients_ar TEXT,
ADD COLUMN IF NOT EXISTS slider_image TEXT,
ADD COLUMN IF NOT EXISTS slider_image_en TEXT,
ADD COLUMN IF NOT EXISTS slider_image_he TEXT,
ADD COLUMN IF NOT EXISTS slider_image_ar TEXT;

-- Обновить NULL значения
UPDATE products 
SET 
  ingredients = COALESCE(ingredients, ''),
  ingredients_en = COALESCE(ingredients_en, ''),
  ingredients_he = COALESCE(ingredients_he, ''),
  ingredients_ar = COALESCE(ingredients_ar, ''),
  slider_image = COALESCE(slider_image, ''),
  slider_image_en = COALESCE(slider_image_en, ''),
  slider_image_he = COALESCE(slider_image_he, ''),
  slider_image_ar = COALESCE(slider_image_ar, '');
```

## Важные замечания

1. **Безопасность**: Миграция использует `IF NOT EXISTS` - можно выполнять несколько раз без ошибок
2. **Данные**: Существующие данные не будут потеряны
3. **Производительность**: Добавлены индексы для поиска по составу
4. **Совместимость**: Миграция совместима с текущей схемой базы данных

## Проверка успешного применения
```sql
-- Проверить структуру таблицы
\d products

-- Проверить новые колонки
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'products' 
  AND (column_name LIKE 'ingredients%' OR column_name LIKE 'slider_image%');
```

## Откат (если необходимо)
```sql
-- ВНИМАНИЕ: Удалит все данные в полях состава и слайдера!
ALTER TABLE products 
DROP COLUMN IF EXISTS ingredients,
DROP COLUMN IF EXISTS ingredients_en,
DROP COLUMN IF EXISTS ingredients_he,
DROP COLUMN IF EXISTS ingredients_ar,
DROP COLUMN IF EXISTS slider_image,
DROP COLUMN IF EXISTS slider_image_en,
DROP COLUMN IF EXISTS slider_image_he,
DROP COLUMN IF EXISTS slider_image_ar;
```
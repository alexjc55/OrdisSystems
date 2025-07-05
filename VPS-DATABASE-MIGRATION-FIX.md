# ИСПРАВЛЕНИЕ ОШИБКИ БАЗЫ ДАННЫХ НА VPS СЕРВЕРЕ

## Проблема
Ошибка: `column "logo_url_en" of relation "store_settings" does not exist`

## Причина
На VPS сервере база данных не содержит многоязычные поля для логотипов и баннеров, которые требуются для работы системы управления темами.

## Решение

### 1. Подключение к базе данных на VPS
```bash
# Подключиться к PostgreSQL на VPS
sudo -u postgres psql edahouse_ord
```

### 2. Выполнить миграцию (скопировать и вставить в psql)
```sql
-- Добавить многоязычные поля логотипов
ALTER TABLE store_settings 
ADD COLUMN IF NOT EXISTS logo_url_en VARCHAR(500) DEFAULT '',
ADD COLUMN IF NOT EXISTS logo_url_he VARCHAR(500) DEFAULT '',
ADD COLUMN IF NOT EXISTS logo_url_ar VARCHAR(500) DEFAULT '';

-- Добавить многоязычные поля баннеров  
ALTER TABLE store_settings 
ADD COLUMN IF NOT EXISTS banner_image_url_en VARCHAR(500) DEFAULT '',
ADD COLUMN IF NOT EXISTS banner_image_url_he VARCHAR(500) DEFAULT '',
ADD COLUMN IF NOT EXISTS banner_image_url_ar VARCHAR(500) DEFAULT '';

-- Добавить многоязычные поля для корзины
ALTER TABLE store_settings 
ADD COLUMN IF NOT EXISTS cart_banner_image_en VARCHAR(500) DEFAULT '',
ADD COLUMN IF NOT EXISTS cart_banner_image_he VARCHAR(500) DEFAULT '',
ADD COLUMN IF NOT EXISTS cart_banner_image_ar VARCHAR(500) DEFAULT '';

-- Добавить многоязычные поля PWA иконок
ALTER TABLE store_settings 
ADD COLUMN IF NOT EXISTS pwa_icon_en VARCHAR(500) DEFAULT '',
ADD COLUMN IF NOT EXISTS pwa_icon_he VARCHAR(500) DEFAULT '',
ADD COLUMN IF NOT EXISTS pwa_icon_ar VARCHAR(500) DEFAULT '';

-- Обновить таблицу themes (если существует)
ALTER TABLE themes 
ADD COLUMN IF NOT EXISTS logo_url_en VARCHAR(500) DEFAULT '',
ADD COLUMN IF NOT EXISTS logo_url_he VARCHAR(500) DEFAULT '',
ADD COLUMN IF NOT EXISTS logo_url_ar VARCHAR(500) DEFAULT '',
ADD COLUMN IF NOT EXISTS banner_image_url_en VARCHAR(500) DEFAULT '',
ADD COLUMN IF NOT EXISTS banner_image_url_he VARCHAR(500) DEFAULT '',
ADD COLUMN IF NOT EXISTS banner_image_url_ar VARCHAR(500) DEFAULT '';
```

### 3. Проверить результат
```sql
-- Проверить, что поля добавлены
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'store_settings' AND column_name LIKE '%logo_url%';

-- Должно показать:
-- logo_url
-- logo_url_en  
-- logo_url_he
-- logo_url_ar
```

### 4. Выйти из psql
```sql
\q
```

### 5. Перезапустить приложение на VPS
```bash
# Перезапустить PM2 процесс
pm2 restart edahouse
```

## Проверка исправления
После выполнения миграции приложение должно работать без ошибок активации тем.

## Альтернативный способ (через файл)
1. Скопировать файл `migrations/add-multilingual-logo-fields.sql` на VPS сервер
2. Выполнить: `psql -U postgres -d edahouse_ord -f migrations/add-multilingual-logo-fields.sql`
#!/bin/bash

# Быстрое исправление базы данных - добавление всех необходимых колонок
# Использует данные из .env файла для подключения

set -e

echo "🚀 Быстрое исправление структуры базы данных..."

# Поиск .env файла
ENV_FILE=""
if [ -f ".env" ]; then
    ENV_FILE=".env"
elif [ -f ".env.production" ]; then
    ENV_FILE=".env.production"
elif [ -f ".env.vps" ]; then
    ENV_FILE=".env.vps"
else
    echo "❌ Файл .env не найден!"
    exit 1
fi

echo "📁 Используется файл: $ENV_FILE"

# Загружаем переменные из .env безопасно
export $(grep -v '^#' $ENV_FILE | grep -v '^$' | xargs)

# Парсим DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL не найден в $ENV_FILE"
    exit 1
fi

DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

echo "🔗 Подключение: $DB_USER@$DB_HOST:$DB_PORT/$DB_NAME"

export PGPASSWORD="$DB_PASS"

# Создаем полный SQL скрипт для исправления
cat > fix-database.sql << 'EOF'
-- Быстрое исправление базы данных eDAHouse
BEGIN;

-- Добавляем все недостающие колонки
ALTER TABLE store_settings 
ADD COLUMN IF NOT EXISTS enabled_languages JSONB DEFAULT '["ru", "en", "he", "ar"]',
ADD COLUMN IF NOT EXISTS default_language VARCHAR(5) DEFAULT 'ru',
ADD COLUMN IF NOT EXISTS worker_permissions JSONB DEFAULT '{"canManageProducts": true, "canManageCategories": true, "canManageOrders": true, "canViewUsers": false, "canManageUsers": false, "canViewSettings": false, "canManageSettings": false, "canManageThemes": false, "canCreateOrders": true}',
ADD COLUMN IF NOT EXISTS pwa_name VARCHAR(100) DEFAULT 'eDAHouse',
ADD COLUMN IF NOT EXISTS pwa_description TEXT DEFAULT 'Готовые блюда с доставкой',
ADD COLUMN IF NOT EXISTS pwa_icon VARCHAR(500),
ADD COLUMN IF NOT EXISTS pwa_name_en VARCHAR(100),
ADD COLUMN IF NOT EXISTS pwa_name_he VARCHAR(100),
ADD COLUMN IF NOT EXISTS pwa_name_ar VARCHAR(100),
ADD COLUMN IF NOT EXISTS pwa_description_en TEXT,
ADD COLUMN IF NOT EXISTS pwa_description_he TEXT,
ADD COLUMN IF NOT EXISTS pwa_description_ar TEXT,
ADD COLUMN IF NOT EXISTS theme_primary_color VARCHAR(20) DEFAULT '#0ea5e9',
ADD COLUMN IF NOT EXISTS theme_secondary_color VARCHAR(20) DEFAULT '#64748b',
ADD COLUMN IF NOT EXISTS theme_accent_color VARCHAR(20) DEFAULT '#f59e0b',
ADD COLUMN IF NOT EXISTS theme_background_color VARCHAR(20) DEFAULT '#ffffff',
ADD COLUMN IF NOT EXISTS theme_text_color VARCHAR(20) DEFAULT '#1e293b',
ADD COLUMN IF NOT EXISTS theme_success_color VARCHAR(20) DEFAULT '#10b981',
ADD COLUMN IF NOT EXISTS theme_warning_color VARCHAR(20) DEFAULT '#f59e0b',
ADD COLUMN IF NOT EXISTS theme_error_color VARCHAR(20) DEFAULT '#ef4444',
ADD COLUMN IF NOT EXISTS custom_css TEXT;

-- Убеждаемся, что в таблице есть хотя бы одна запись настроек
INSERT INTO store_settings (
    id, store_name, welcome_title, store_description, phone, email, address,
    delivery_fee, free_delivery_minimum, enabled_languages, default_language,
    pwa_name, pwa_description
) 
SELECT 
    1, 'eDAHouse', 'Добро пожаловать!', 'Готовые блюда с доставкой', 
    '+972-XX-XXX-XXXX', 'info@edahouse.com', 'Израиль',
    20.0, 100.0, '["ru", "en", "he", "ar"]', 'ru',
    'eDAHouse', 'Готовые блюда с доставкой'
WHERE NOT EXISTS (SELECT 1 FROM store_settings WHERE id = 1);

COMMIT;

SELECT 'База данных успешно исправлена!' as result;
SELECT column_name FROM information_schema.columns WHERE table_name = 'store_settings' ORDER BY column_name;
EOF

echo "🔧 Применение исправления..."

if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f fix-database.sql; then
    echo "✅ База данных успешно исправлена!"
    echo "🔄 Перезапускаем приложение..."
    pm2 restart demo
    echo "🎉 Готово! Приложение должно работать без ошибок."
else
    echo "❌ Ошибка при исправлении базы данных!"
    exit 1
fi

# Очистка
rm fix-database.sql
echo "🧹 Временные файлы удалены."
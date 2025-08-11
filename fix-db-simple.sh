#!/bin/bash

# Простое исправление базы данных - только для DATABASE_URL

set -e

echo "🚀 Исправление базы данных..."

# Извлекаем DATABASE_URL из .env
DATABASE_URL=$(grep "^DATABASE_URL=" .env | cut -d'=' -f2-)

if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL не найден в .env"
    exit 1
fi

echo "🔗 Найден DATABASE_URL"

# Парсим компоненты URL
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

export PGPASSWORD="$DB_PASS"

echo "🔧 Добавление недостающих колонок..."

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << 'EOF'
BEGIN;

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

COMMIT;

SELECT 'База данных успешно исправлена!' as result;
EOF

if [ $? -eq 0 ]; then
    echo "✅ База данных успешно исправлена!"
    echo "🔄 Перезапускаем приложение..."
    pm2 restart demo
    echo "🎉 Готово!"
else
    echo "❌ Ошибка при исправлении базы данных!"
    exit 1
fi
#!/bin/bash

# Автоматическое исправление базы данных на VPS сервере
# Устраняет ошибку: column "logo_url_en" of relation "store_settings" does not exist

echo "🔧 Исправление базы данных на VPS сервере..."
echo "Проблема: Отсутствуют многоязычные поля для логотипов и баннеров"
echo

# Проверка доступности PostgreSQL
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL не установлен или недоступен"
    exit 1
fi

# Проверка переменных окружения
if [ -z "$PGDATABASE" ] || [ -z "$PGUSER" ] || [ -z "$PGHOST" ] || [ -z "$PGPORT" ]; then
    echo "⚠️  Переменные окружения для PostgreSQL не найдены"
    echo "Используем стандартные значения для VPS"
    export PGDATABASE="edahouse_ord"
    export PGUSER="postgres"
    export PGHOST="localhost"
    export PGPORT="5432"
fi

echo "📋 Параметры подключения:"
echo "  База данных: $PGDATABASE"
echo "  Пользователь: $PGUSER"
echo "  Хост: $PGHOST"
echo "  Порт: $PGPORT"
echo

# Создание временного файла миграции
MIGRATION_FILE="/tmp/vps_database_migration.sql"
cat > "$MIGRATION_FILE" << 'EOF'
-- Добавление многоязычных полей в store_settings
ALTER TABLE store_settings 
ADD COLUMN IF NOT EXISTS logo_url_en VARCHAR(500) DEFAULT '',
ADD COLUMN IF NOT EXISTS logo_url_he VARCHAR(500) DEFAULT '',
ADD COLUMN IF NOT EXISTS logo_url_ar VARCHAR(500) DEFAULT '';

ALTER TABLE store_settings 
ADD COLUMN IF NOT EXISTS banner_image_url_en VARCHAR(500) DEFAULT '',
ADD COLUMN IF NOT EXISTS banner_image_url_he VARCHAR(500) DEFAULT '',
ADD COLUMN IF NOT EXISTS banner_image_url_ar VARCHAR(500) DEFAULT '';

ALTER TABLE store_settings 
ADD COLUMN IF NOT EXISTS cart_banner_image_en VARCHAR(500) DEFAULT '',
ADD COLUMN IF NOT EXISTS cart_banner_image_he VARCHAR(500) DEFAULT '',
ADD COLUMN IF NOT EXISTS cart_banner_image_ar VARCHAR(500) DEFAULT '';

ALTER TABLE store_settings 
ADD COLUMN IF NOT EXISTS pwa_icon_en VARCHAR(500) DEFAULT '',
ADD COLUMN IF NOT EXISTS pwa_icon_he VARCHAR(500) DEFAULT '',
ADD COLUMN IF NOT EXISTS pwa_icon_ar VARCHAR(500) DEFAULT '';

-- Обновление таблицы themes (если существует)
ALTER TABLE themes 
ADD COLUMN IF NOT EXISTS logo_url_en VARCHAR(500) DEFAULT '',
ADD COLUMN IF NOT EXISTS logo_url_he VARCHAR(500) DEFAULT '',
ADD COLUMN IF NOT EXISTS logo_url_ar VARCHAR(500) DEFAULT '',
ADD COLUMN IF NOT EXISTS banner_image_url_en VARCHAR(500) DEFAULT '',
ADD COLUMN IF NOT EXISTS banner_image_url_he VARCHAR(500) DEFAULT '',
ADD COLUMN IF NOT EXISTS banner_image_url_ar VARCHAR(500) DEFAULT '';

-- Проверка результата
SELECT 'Миграция выполнена успешно' as status;
EOF

echo "🗃️ Выполняем миграцию базы данных..."

# Выполнение миграции
if psql -f "$MIGRATION_FILE" 2>/dev/null; then
    echo "✅ Миграция выполнена успешно!"
    
    # Проверка добавленных полей
    echo "🔍 Проверяем добавленные поля..."
    psql -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'store_settings' AND column_name LIKE '%logo_url%' ORDER BY column_name;" 2>/dev/null
    
    echo
    echo "🎉 База данных успешно обновлена!"
    echo "Теперь нужно перезапустить приложение на VPS:"
    echo "  pm2 restart edahouse"
    
else
    echo "❌ Ошибка выполнения миграции"
    echo "Попробуйте выполнить миграцию вручную:"
    echo "  sudo -u postgres psql edahouse_ord"
    echo "  Затем скопируйте содержимое файла migrations/add-multilingual-logo-fields.sql"
fi

# Удаление временного файла
rm -f "$MIGRATION_FILE"
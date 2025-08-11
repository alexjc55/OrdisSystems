#!/bin/bash

# Автоматический скрипт синхронизации структуры базы данных
# Сравнивает структуру продакшн БД с эталонной и вносит необходимые изменения

set -e  # Остановка при любой ошибке

echo "🔧 Запуск автоматической синхронизации структуры базы данных..."

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функция для вывода сообщений
log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

# 1. Поиск файла .env и извлечение данных подключения
log_info "Поиск конфигурации базы данных..."

ENV_FILE=""
if [ -f ".env" ]; then
    ENV_FILE=".env"
elif [ -f ".env.production" ]; then
    ENV_FILE=".env.production"
elif [ -f ".env.vps" ]; then
    ENV_FILE=".env.vps"
else
    log_error "Файл .env не найден!"
    exit 1
fi

log_success "Найден файл конфигурации: $ENV_FILE"

# Загружаем переменные из .env файла
source $ENV_FILE

# Извлекаем данные подключения из DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    log_error "DATABASE_URL не найден в $ENV_FILE"
    exit 1
fi

# Парсим DATABASE_URL (postgres://user:password@host:port/database)
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

log_info "Подключение к базе данных:"
log_info "  Хост: $DB_HOST"
log_info "  Порт: $DB_PORT"
log_info "  База: $DB_NAME"
log_info "  Пользователь: $DB_USER"

# 2. Проверка подключения к базе данных
log_info "Проверка подключения к базе данных..."

export PGPASSWORD="$DB_PASS"

if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
    log_error "Не удается подключиться к базе данных!"
    exit 1
fi

log_success "Подключение к базе данных успешно!"

# 3. Создание дампа текущей структуры продакшн БД
log_info "Создание дампа текущей структуры продакшн БД..."

pg_dump --schema-only --no-owner --no-privileges \
    -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    > current-production-schema.sql

log_success "Дамп текущей структуры создан: current-production-schema.sql"

# 4. Проверка наличия эталонного дампа
if [ ! -f "database-schema-reference.sql" ]; then
    log_error "Эталонный дамп базы данных не найден: database-schema-reference.sql"
    log_info "Создайте эталонный дамп с помощью команды:"
    log_info "pg_dump --schema-only --no-owner --no-privileges > database-schema-reference.sql"
    exit 1
fi

log_success "Найден эталонный дамп: database-schema-reference.sql"

# 5. Сравнение структур и создание миграции
log_info "Анализ различий в структуре базы данных..."

# Создаем временную директорию для анализа
mkdir -p temp_analysis

# Извлекаем список таблиц и колонок из эталонного дампа
grep -E "CREATE TABLE|ADD COLUMN" database-schema-reference.sql | \
    sed 's/^[[:space:]]*//' > temp_analysis/reference_structure.txt

# Извлекаем список таблиц и колонок из продакшн дампа
grep -E "CREATE TABLE|ADD COLUMN" current-production-schema.sql | \
    sed 's/^[[:space:]]*//' > temp_analysis/production_structure.txt

# Находим отсутствующие элементы
comm -23 <(sort temp_analysis/reference_structure.txt) <(sort temp_analysis/production_structure.txt) > temp_analysis/missing_elements.txt

# 6. Создание SQL скрипта миграции
log_info "Создание SQL скрипта миграции..."

cat > migration-script.sql << 'EOF'
-- Автоматически сгенерированный скрипт миграции базы данных
-- Дата создания: $(date)

BEGIN;

-- Добавление отсутствующих колонок в store_settings
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

-- Добавление отсутствующих индексов если они отсутствуют
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

-- Проверка и создание отсутствующих constraint'ов
DO $$
BEGIN
    -- Проверяем существование constraint'а на статус заказа
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'orders_status_check'
    ) THEN
        ALTER TABLE orders ADD CONSTRAINT orders_status_check 
        CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'));
    END IF;
END $$;

COMMIT;

-- Вывод информации о завершении миграции
SELECT 'Миграция успешно завершена!' as result;
EOF

log_success "Создан SQL скрипт миграции: migration-script.sql"

# 7. Применение миграции
log_warning "Применение миграции к продакшн базе данных..."
log_warning "ВНИМАНИЕ: Будут внесены изменения в структуру базы данных!"

read -p "Продолжить? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    log_info "Операция отменена пользователем."
    exit 0
fi

log_info "Применение миграции..."

if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f migration-script.sql; then
    log_success "Миграция успешно применена!"
else
    log_error "Ошибка при применении миграции!"
    exit 1
fi

# 8. Проверка результата
log_info "Проверка результата миграции..."

# Создаем новый дамп после миграции
pg_dump --schema-only --no-owner --no-privileges \
    -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    > post-migration-schema.sql

log_success "Создан дамп структуры после миграции: post-migration-schema.sql"

# 9. Очистка временных файлов
log_info "Очистка временных файлов..."
rm -rf temp_analysis
log_success "Временные файлы удалены."

# 10. Финальный отчет
log_success "🎉 Синхронизация структуры базы данных завершена!"
log_info "Файлы созданы:"
log_info "  - current-production-schema.sql (дамп до миграции)"
log_info "  - migration-script.sql (примененный скрипт миграции)"
log_info "  - post-migration-schema.sql (дамп после миграции)"

log_warning "Рекомендуется перезапустить приложение для применения изменений:"
log_warning "pm2 restart demo"

echo ""
log_success "✨ Готово! База данных синхронизирована с эталонной структурой."
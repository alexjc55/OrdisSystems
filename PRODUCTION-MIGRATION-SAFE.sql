-- ===================================================================
-- БЕЗОПАСНАЯ МИГРАЦИЯ ДЛЯ ПРОДАКШН СЕРВЕРА eDAHouse
-- ===================================================================
-- Этот скрипт добавляет только новые поля без изменения существующих данных
-- Выполняйте команды по одной и проверяйте результат после каждой

-- 1. ДОБАВЛЕНИЕ НОВОГО ПОЛЯ canCreateOrders В worker_permissions
-- Проверяем есть ли уже поле canCreateOrders в настройках прав доступа
-- Если его нет - добавляем со значением по умолчанию true

UPDATE store_settings 
SET worker_permissions = jsonb_set(
    COALESCE(worker_permissions, '{}'::jsonb),
    '{canCreateOrders}',
    'true'::jsonb
)
WHERE id = 1 
AND (worker_permissions IS NULL OR NOT worker_permissions ? 'canCreateOrders');

-- 2. ПРОВЕРЯЕМ РЕЗУЛЬТАТ
-- Выполните эту команду, чтобы убедиться что поле добавлено правильно:
SELECT worker_permissions FROM store_settings WHERE id = 1;

-- 3. ДОБАВЛЕНИЕ ТАБЛИЦЫ user_addresses (если её нет)
-- Эта таблица может отсутствовать на старом сервере
CREATE TABLE IF NOT EXISTS user_addresses (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR NOT NULL REFERENCES users(id),
    label VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- 4. ОБНОВЛЕНИЕ СХЕМЫ ПОЛЬЗОВАТЕЛЕЙ (добавляем недостающие поля если их нет)
-- Добавляем поле defaultAddress если его нет
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'default_address'
    ) THEN
        ALTER TABLE users ADD COLUMN default_address TEXT;
    END IF;
END $$;

-- Добавляем поле passwordResetToken если его нет
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'password_reset_token'
    ) THEN
        ALTER TABLE users ADD COLUMN password_reset_token VARCHAR;
    END IF;
END $$;

-- Добавляем поле passwordResetExpires если его нет
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'password_reset_expires'
    ) THEN
        ALTER TABLE users ADD COLUMN password_reset_expires TIMESTAMP;
    END IF;
END $$;

-- 5. ОБНОВЛЕНИЕ ТАБЛИЦЫ ПРОДУКТОВ (добавляем поле barcode если его нет)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'barcode'
    ) THEN
        ALTER TABLE products ADD COLUMN barcode VARCHAR;
    END IF;
END $$;

-- 6. ДОБАВЛЕНИЕ СИСТЕМЫ ШТРИХ-КОДОВ В НАСТРОЙКИ (если полей нет)
DO $$ 
BEGIN
    -- barcode_system_enabled
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'store_settings' AND column_name = 'barcode_system_enabled'
    ) THEN
        ALTER TABLE store_settings ADD COLUMN barcode_system_enabled BOOLEAN DEFAULT false;
    END IF;
    
    -- barcode_product_code_start
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'store_settings' AND column_name = 'barcode_product_code_start'
    ) THEN
        ALTER TABLE store_settings ADD COLUMN barcode_product_code_start INTEGER DEFAULT 2;
    END IF;
    
    -- barcode_product_code_end
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'store_settings' AND column_name = 'barcode_product_code_end'
    ) THEN
        ALTER TABLE store_settings ADD COLUMN barcode_product_code_end INTEGER DEFAULT 5;
    END IF;
    
    -- barcode_weight_start
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'store_settings' AND column_name = 'barcode_weight_start'
    ) THEN
        ALTER TABLE store_settings ADD COLUMN barcode_weight_start INTEGER DEFAULT 6;
    END IF;
    
    -- barcode_weight_end
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'store_settings' AND column_name = 'barcode_weight_end'
    ) THEN
        ALTER TABLE store_settings ADD COLUMN barcode_weight_end INTEGER DEFAULT 10;
    END IF;
    
    -- barcode_weight_unit
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'store_settings' AND column_name = 'barcode_weight_unit'
    ) THEN
        ALTER TABLE store_settings ADD COLUMN barcode_weight_unit VARCHAR DEFAULT 'grams';
    END IF;
END $$;

-- 7. ВКЛЮЧЕНИЕ СИСТЕМЫ ШТРИХ-КОДОВ
UPDATE store_settings 
SET barcode_system_enabled = true,
    barcode_product_code_start = 2,
    barcode_product_code_end = 5,
    barcode_weight_start = 6,
    barcode_weight_end = 10,
    barcode_weight_unit = 'grams'
WHERE id = 1;

-- 8. ФИНАЛЬНАЯ ПРОВЕРКА
-- Выполните эти запросы, чтобы убедиться что всё прошло успешно:

-- Проверяем права доступа работников
SELECT 
    id, 
    store_name,
    worker_permissions->'canCreateOrders' as can_create_orders,
    barcode_system_enabled
FROM store_settings WHERE id = 1;

-- Проверяем структуру таблицы products
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'products' AND column_name IN ('barcode')
ORDER BY ordinal_position;

-- Проверяем структуру таблицы users  
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name IN ('default_address', 'password_reset_token', 'password_reset_expires')
ORDER BY ordinal_position;

-- ===================================================================
-- ВАЖНЫЕ ЗАМЕЧАНИЯ:
-- ===================================================================
-- 1. ВСЕ СУЩЕСТВУЮЩИЕ ДАННЫЕ ОСТАНУТСЯ БЕЗ ИЗМЕНЕНИЙ
-- 2. Фотографии и файлы не затрагиваются
-- 3. Пользователи и заказы сохраняются
-- 4. Добавляются только новые функции
-- 5. Резервная копия базы рекомендуется перед началом
-- 
-- КОМАНДА ДЛЯ СОЗДАНИЯ РЕЗЕРВНОЙ КОПИИ:
-- pg_dump -U your_username -h your_host -d your_database > backup_$(date +%Y%m%d_%H%M%S).sql
-- ===================================================================
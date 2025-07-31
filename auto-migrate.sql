-- ===================================================================
-- АВТОМАТИЧЕСКИЙ СКРИПТ МИГРАЦИИ eDAHouse
-- ===================================================================
-- Этот скрипт автоматически проверяет что отсутствует и добавляет только нужное
-- Безопасно запускать на любой версии базы данных - не сломает существующие данные

DO $$
DECLARE
    table_exists boolean;
    column_exists boolean;
    current_rights jsonb;
BEGIN
    RAISE NOTICE 'Начинаем автоматическую миграцию базы данных eDAHouse...';
    
    -- =================================================================
    -- 1. ПРОВЕРКА И СОЗДАНИЕ ТАБЛИЦЫ user_addresses
    -- =================================================================
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_addresses'
    ) INTO table_exists;
    
    IF NOT table_exists THEN
        RAISE NOTICE '[✓] Создаю таблицу user_addresses...';
        CREATE TABLE user_addresses (
            id SERIAL PRIMARY KEY,
            user_id VARCHAR NOT NULL REFERENCES users(id),
            label VARCHAR(100) NOT NULL,
            address TEXT NOT NULL,
            is_default BOOLEAN DEFAULT false,
            created_at TIMESTAMP DEFAULT now(),
            updated_at TIMESTAMP DEFAULT now()
        );
    ELSE
        RAISE NOTICE '[✓] Таблица user_addresses уже существует';
    END IF;

    -- =================================================================
    -- 2. ОБНОВЛЕНИЕ ТАБЛИЦЫ users (добавляем недостающие поля)
    -- =================================================================
    
    -- default_address
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'default_address'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        RAISE NOTICE '[✓] Добавляю поле default_address в таблицу users...';
        ALTER TABLE users ADD COLUMN default_address TEXT;
    ELSE
        RAISE NOTICE '[✓] Поле default_address уже существует в users';
    END IF;
    
    -- password_reset_token
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'password_reset_token'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        RAISE NOTICE '[✓] Добавляю поле password_reset_token в таблицу users...';
        ALTER TABLE users ADD COLUMN password_reset_token VARCHAR;
    ELSE
        RAISE NOTICE '[✓] Поле password_reset_token уже существует в users';
    END IF;
    
    -- password_reset_expires
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'password_reset_expires'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        RAISE NOTICE '[✓] Добавляю поле password_reset_expires в таблицу users...';
        ALTER TABLE users ADD COLUMN password_reset_expires TIMESTAMP;
    ELSE
        RAISE NOTICE '[✓] Поле password_reset_expires уже существует в users';
    END IF;

    -- =================================================================
    -- 3. ОБНОВЛЕНИЕ ТАБЛИЦЫ products (штрих-коды)
    -- =================================================================
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'barcode'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        RAISE NOTICE '[✓] Добавляю поле barcode в таблицу products...';
        ALTER TABLE products ADD COLUMN barcode VARCHAR;
    ELSE
        RAISE NOTICE '[✓] Поле barcode уже существует в products';
    END IF;

    -- =================================================================
    -- 4. СИСТЕМА ШТРИХ-КОДОВ В store_settings
    -- =================================================================
    
    -- barcode_system_enabled
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'store_settings' AND column_name = 'barcode_system_enabled'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        RAISE NOTICE '[✓] Добавляю настройки системы штрих-кодов...';
        ALTER TABLE store_settings ADD COLUMN barcode_system_enabled BOOLEAN DEFAULT false;
        ALTER TABLE store_settings ADD COLUMN barcode_product_code_start INTEGER DEFAULT 2;
        ALTER TABLE store_settings ADD COLUMN barcode_product_code_end INTEGER DEFAULT 5;
        ALTER TABLE store_settings ADD COLUMN barcode_weight_start INTEGER DEFAULT 6;
        ALTER TABLE store_settings ADD COLUMN barcode_weight_end INTEGER DEFAULT 10;
        ALTER TABLE store_settings ADD COLUMN barcode_weight_unit VARCHAR DEFAULT 'grams';
        
        -- Включаем систему штрих-кодов
        UPDATE store_settings SET 
            barcode_system_enabled = true,
            barcode_product_code_start = 2,
            barcode_product_code_end = 5,
            barcode_weight_start = 6,
            barcode_weight_end = 10,
            barcode_weight_unit = 'grams'
        WHERE id = 1;
    ELSE
        RAISE NOTICE '[✓] Система штрих-кодов уже настроена';
    END IF;

    -- =================================================================
    -- 5. МНОГОЯЗЫЧНЫЕ ПОЛЯ В products (если их нет)
    -- =================================================================
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'name_en'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        RAISE NOTICE '[✓] Добавляю многоязычные поля в products...';
        ALTER TABLE products ADD COLUMN name_en VARCHAR;
        ALTER TABLE products ADD COLUMN name_he VARCHAR;
        ALTER TABLE products ADD COLUMN name_ar VARCHAR;
        ALTER TABLE products ADD COLUMN description_en TEXT;
        ALTER TABLE products ADD COLUMN description_he TEXT;
        ALTER TABLE products ADD COLUMN description_ar TEXT;
        ALTER TABLE products ADD COLUMN image_url_en VARCHAR;
        ALTER TABLE products ADD COLUMN image_url_he VARCHAR;
        ALTER TABLE products ADD COLUMN image_url_ar VARCHAR;
    ELSE
        RAISE NOTICE '[✓] Многоязычные поля в products уже существуют';
    END IF;

    -- =================================================================
    -- 6. МНОГОЯЗЫЧНЫЕ ПОЛЯ В categories (если их нет)
    -- =================================================================
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'categories' AND column_name = 'name_en'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        RAISE NOTICE '[✓] Добавляю многоязычные поля в categories...';
        ALTER TABLE categories ADD COLUMN name_en VARCHAR(255);
        ALTER TABLE categories ADD COLUMN name_he VARCHAR(255);
        ALTER TABLE categories ADD COLUMN name_ar VARCHAR(255);
        ALTER TABLE categories ADD COLUMN description_en TEXT;
        ALTER TABLE categories ADD COLUMN description_he TEXT;
        ALTER TABLE categories ADD COLUMN description_ar TEXT;
    ELSE
        RAISE NOTICE '[✓] Многоязычные поля в categories уже существуют';
    END IF;

    -- =================================================================
    -- 7. ТАБЛИЦА themes (если её нет)
    -- =================================================================
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'themes'
    ) INTO table_exists;
    
    IF NOT table_exists THEN
        RAISE NOTICE '[✓] Создаю таблицу themes...';
        CREATE TABLE themes (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            is_active BOOLEAN DEFAULT false,
            primary_color TEXT NOT NULL,
            primary_dark_color TEXT NOT NULL,
            primary_light_color TEXT NOT NULL,
            secondary_color TEXT NOT NULL,
            accent_color TEXT NOT NULL,
            success_color TEXT NOT NULL,
            success_light_color TEXT NOT NULL,
            warning_color TEXT NOT NULL,
            warning_light_color TEXT NOT NULL,
            error_color TEXT NOT NULL,
            error_light_color TEXT NOT NULL,
            info_color TEXT NOT NULL,
            info_light_color TEXT NOT NULL,
            white_color TEXT NOT NULL,
            gray50_color TEXT NOT NULL,
            gray100_color TEXT NOT NULL,
            gray200_color TEXT NOT NULL,
            gray300_color TEXT NOT NULL,
            gray400_color TEXT NOT NULL,
            gray500_color TEXT NOT NULL,
            gray600_color TEXT NOT NULL,
            gray700_color TEXT NOT NULL,
            gray800_color TEXT NOT NULL,
            gray900_color TEXT NOT NULL,
            font_family_primary TEXT NOT NULL,
            font_family_secondary TEXT NOT NULL,
            primary_shadow TEXT NOT NULL,
            success_shadow TEXT NOT NULL,
            warning_shadow TEXT NOT NULL,
            error_shadow TEXT NOT NULL,
            info_shadow TEXT NOT NULL,
            gray_shadow TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT now(),
            updated_at TIMESTAMP DEFAULT now(),
            primary_text_color VARCHAR DEFAULT 'hsl(0, 0%, 100%)',
            tomorrow_shadow VARCHAR DEFAULT '0 4px 14px 0 rgba(147, 51, 234, 0.3)',
            tomorrow_color VARCHAR DEFAULT 'hsl(262, 83%, 58%)',
            tomorrow_light_color VARCHAR DEFAULT 'hsl(262, 83%, 96%)',
            out_of_stock_color VARCHAR DEFAULT 'hsl(0, 84%, 60%)',
            tomorrow_dark_color VARCHAR DEFAULT 'hsl(262, 83%, 48%)'
        );
    ELSE
        RAISE NOTICE '[✓] Таблица themes уже существует';
    END IF;

    -- =================================================================
    -- 8. ТАБЛИЦА push_subscriptions (если её нет)
    -- =================================================================
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'push_subscriptions'
    ) INTO table_exists;
    
    IF NOT table_exists THEN
        RAISE NOTICE '[✓] Создаю таблицу push_subscriptions...';
        CREATE TABLE push_subscriptions (
            id SERIAL PRIMARY KEY,
            user_id TEXT NOT NULL,
            endpoint TEXT NOT NULL,
            p256dh TEXT NOT NULL,
            auth TEXT NOT NULL,
            user_agent TEXT,
            created_at TIMESTAMP DEFAULT now(),
            updated_at TIMESTAMP DEFAULT now()
        );
    ELSE
        RAISE NOTICE '[✓] Таблица push_subscriptions уже существует';
    END IF;

    -- =================================================================
    -- 9. ТАБЛИЦА marketing_notifications (если её нет)
    -- =================================================================
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'marketing_notifications'
    ) INTO table_exists;
    
    IF NOT table_exists THEN
        RAISE NOTICE '[✓] Создаю таблицу marketing_notifications...';
        CREATE TABLE marketing_notifications (
            id SERIAL PRIMARY KEY,
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            title_en TEXT,
            message_en TEXT,
            title_he TEXT,
            message_he TEXT,
            title_ar TEXT,
            message_ar TEXT,
            sent_count INTEGER DEFAULT 0,
            created_by TEXT NOT NULL,
            sent_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT now()
        );
    ELSE
        RAISE NOTICE '[✓] Таблица marketing_notifications уже существует';
    END IF;

    -- =================================================================
    -- 10. ПРАВА ДОСТУПА canCreateOrders (ГЛАВНОЕ ОБНОВЛЕНИЕ)
    -- =================================================================
    SELECT worker_permissions FROM store_settings WHERE id = 1 INTO current_rights;
    
    IF current_rights IS NULL OR NOT (current_rights ? 'canCreateOrders') THEN
        RAISE NOTICE '[✓] Добавляю право canCreateOrders в worker_permissions...';
        UPDATE store_settings 
        SET worker_permissions = jsonb_set(
            COALESCE(worker_permissions, '{}'::jsonb),
            '{canCreateOrders}',
            'true'::jsonb
        )
        WHERE id = 1;
    ELSE
        RAISE NOTICE '[✓] Право canCreateOrders уже существует';
    END IF;

    -- =================================================================
    -- 11. ФИНАЛЬНАЯ ПРОВЕРКА И ОТЧЕТ
    -- =================================================================
    RAISE NOTICE '================================================================';
    RAISE NOTICE 'МИГРАЦИЯ ЗАВЕРШЕНА УСПЕШНО!';
    RAISE NOTICE '================================================================';
    
    -- Показываем итоговое состояние
    SELECT worker_permissions->'canCreateOrders' as can_create_orders FROM store_settings WHERE id = 1;
    
    RAISE NOTICE 'Проверьте что новая функция работает:';
    RAISE NOTICE '1. Зайдите в админ-панель';
    RAISE NOTICE '2. Откройте "Права доступа"';  
    RAISE NOTICE '3. Найдите переключатель "Создание заказов"';
    RAISE NOTICE '4. Попробуйте его включить/выключить';
    RAISE NOTICE '================================================================';

END $$;

-- Показываем финальные настройки
SELECT 
    'FINAL_CHECK' as status,
    store_name,
    worker_permissions->'canCreateOrders' as can_create_orders,
    barcode_system_enabled,
    default_language,
    enabled_languages
FROM store_settings WHERE id = 1;
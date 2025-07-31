-- Окончательное исправление продакшн сервера
DO $$
BEGIN
    -- Добавляем поле barcode в products если его нет
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'barcode'
    ) THEN
        RAISE NOTICE 'Добавляю поле barcode в products...';
        ALTER TABLE products ADD COLUMN barcode VARCHAR(50);
        RAISE NOTICE 'Поле barcode добавлено в products';
    ELSE
        RAISE NOTICE 'Поле barcode уже существует в products';
    END IF;
    
    -- Проверяем все поля системы штрих-кодов в store_settings
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'store_settings' AND column_name = 'barcode_system_enabled'
    ) THEN
        RAISE NOTICE 'Добавляю поля системы штрих-кодов в store_settings...';
        
        ALTER TABLE store_settings ADD COLUMN barcode_system_enabled BOOLEAN DEFAULT false;
        ALTER TABLE store_settings ADD COLUMN barcode_product_code_start INTEGER DEFAULT 2;
        ALTER TABLE store_settings ADD COLUMN barcode_product_code_end INTEGER DEFAULT 5;
        ALTER TABLE store_settings ADD COLUMN barcode_weight_start INTEGER DEFAULT 6;
        ALTER TABLE store_settings ADD COLUMN barcode_weight_end INTEGER DEFAULT 10;
        ALTER TABLE store_settings ADD COLUMN barcode_weight_unit VARCHAR DEFAULT 'grams';
        
        RAISE NOTICE 'Поля системы штрих-кодов добавлены в store_settings';
    ELSE
        RAISE NOTICE 'Поля системы штрих-кодов уже существуют в store_settings';
    END IF;
    
    -- Активируем систему штрих-кодов
    UPDATE store_settings SET 
        barcode_system_enabled = true,
        barcode_product_code_start = 2,
        barcode_product_code_end = 5,
        barcode_weight_start = 6,
        barcode_weight_end = 10,
        barcode_weight_unit = 'grams'
    WHERE id = 1;
    
    RAISE NOTICE 'Система штрих-кодов активирована';
END $$;

-- Проверяем результат
SELECT 
    'SCHEMA_CHECK' as status,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'barcode') as products_barcode_exists,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'store_settings' AND column_name = 'barcode_system_enabled') as barcode_system_exists;

-- Проверяем настройки
SELECT 
    'SETTINGS_CHECK' as status,
    store_name,
    barcode_system_enabled,
    barcode_product_code_start,
    barcode_weight_start
FROM store_settings WHERE id = 1;
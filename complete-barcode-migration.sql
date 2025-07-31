-- Завершаем добавление системы штрих-кодов
DO $$
BEGIN
    -- Добавляем поля системы штрих-кодов если их нет
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'store_settings' AND column_name = 'barcode_system_enabled'
    ) THEN
        RAISE NOTICE 'Добавляю поля системы штрих-кодов...';
        
        ALTER TABLE store_settings ADD COLUMN barcode_system_enabled BOOLEAN DEFAULT false;
        ALTER TABLE store_settings ADD COLUMN barcode_product_code_start INTEGER DEFAULT 2;
        ALTER TABLE store_settings ADD COLUMN barcode_product_code_end INTEGER DEFAULT 5;
        ALTER TABLE store_settings ADD COLUMN barcode_weight_start INTEGER DEFAULT 6;
        ALTER TABLE store_settings ADD COLUMN barcode_weight_end INTEGER DEFAULT 10;
        ALTER TABLE store_settings ADD COLUMN barcode_weight_unit VARCHAR DEFAULT 'grams';
        
        RAISE NOTICE 'Поля системы штрих-кодов добавлены';
    ELSE
        RAISE NOTICE 'Поля системы штрих-кодов уже существуют';
    END IF;
    
    -- Обновляем настройки
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
    'SUCCESS' as status,
    store_name,
    worker_permissions->'canCreateOrders' as can_create_orders,
    barcode_system_enabled,
    barcode_product_code_start,
    barcode_weight_start
FROM store_settings WHERE id = 1;
-- Исправляем последнюю ошибку миграции
-- Показываем финальные настройки правильно

SELECT 
    'FINAL_CHECK' as status,
    store_name,
    worker_permissions->'canCreateOrders' as can_create_orders,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'store_settings' AND column_name = 'barcode_system_enabled')
        THEN 'ENABLED'
        ELSE 'NOT_FOUND'
    END as barcode_status,
    default_language,
    enabled_languages
FROM store_settings WHERE id = 1;

-- Проверяем что поле barcode добавлено в products
SELECT 
    'BARCODE_FIELD_CHECK' as status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'barcode')
        THEN 'SUCCESS - barcode field added'
        ELSE 'ERROR - barcode field missing'
    END as result;

-- Показываем текущие права доступа
SELECT 
    'WORKER_PERMISSIONS' as status,
    worker_permissions
FROM store_settings WHERE id = 1;
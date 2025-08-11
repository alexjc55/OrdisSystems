-- ===================================================================
-- ДИАГНОСТИКА БАЗЫ ДАННЫХ - ПРОВЕРКА РАЗЛИЧИЙ
-- ===================================================================
-- Выполните эти команды на продакшн-сервере чтобы понять что нужно обновить
-- Сохраните результаты и отправьте мне для анализа

-- 1. ОСНОВНАЯ ИНФОРМАЦИЯ О БАЗЕ
SELECT 'DATABASE INFO' as check_type, 
       current_database() as database_name,
       current_user as db_user,
       version() as postgres_version;

-- 2. СПИСОК ВСЕХ ТАБЛИЦ
SELECT 'TABLES' as check_type, 
       table_name, 
       table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- 3. СТРУКТУРА ТАБЛИЦЫ store_settings (самая важная)
SELECT 'STORE_SETTINGS_COLUMNS' as check_type,
       column_name, 
       data_type, 
       is_nullable, 
       column_default
FROM information_schema.columns 
WHERE table_name = 'store_settings' 
ORDER BY ordinal_position;

-- 4. ПРОВЕРКА worker_permissions
SELECT 'WORKER_PERMISSIONS' as check_type,
       id,
       worker_permissions
FROM store_settings 
WHERE id = 1;

-- 5. СТРУКТУРА ТАБЛИЦЫ products
SELECT 'PRODUCTS_COLUMNS' as check_type,
       column_name, 
       data_type, 
       is_nullable
FROM information_schema.columns 
WHERE table_name = 'products' 
ORDER BY ordinal_position;

-- 6. СТРУКТУРА ТАБЛИЦЫ users
SELECT 'USERS_COLUMNS' as check_type,
       column_name, 
       data_type, 
       is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

-- 7. ПРОВЕРКА НАЛИЧИЯ ТАБЛИЦЫ user_addresses
SELECT 'USER_ADDRESSES_TABLE' as check_type,
       CASE 
           WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_addresses') 
           THEN 'EXISTS' 
           ELSE 'NOT_EXISTS' 
       END as status;

-- 8. ПРОВЕРКА НАЛИЧИЯ ПОЛЕЙ ШТРИХ-КОДОВ
SELECT 'BARCODE_FIELDS' as check_type,
       column_name,
       CASE WHEN column_name IS NOT NULL THEN 'EXISTS' ELSE 'NOT_EXISTS' END as status
FROM information_schema.columns 
WHERE table_name = 'store_settings' 
AND column_name IN ('barcode_system_enabled', 'barcode_product_code_start', 'barcode_product_code_end', 'barcode_weight_start', 'barcode_weight_end', 'barcode_weight_unit')
UNION ALL
SELECT 'BARCODE_FIELDS' as check_type,
       'product_barcode' as column_name,
       CASE 
           WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'barcode') 
           THEN 'EXISTS' 
           ELSE 'NOT_EXISTS' 
       END as status;

-- 9. ПРОВЕРКА МНОГОЯЗЫЧНЫХ ПОЛЕЙ В products
SELECT 'MULTILINGUAL_PRODUCTS' as check_type,
       column_name,
       CASE WHEN column_name IS NOT NULL THEN 'EXISTS' ELSE 'NOT_EXISTS' END as status
FROM information_schema.columns 
WHERE table_name = 'products' 
AND column_name IN ('name_en', 'name_he', 'name_ar', 'description_en', 'description_he', 'description_ar', 'image_url_en', 'image_url_he', 'image_url_ar');

-- 10. ПРОВЕРКА МНОГОЯЗЫЧНЫХ ПОЛЕЙ В categories
SELECT 'MULTILINGUAL_CATEGORIES' as check_type,
       column_name,
       CASE WHEN column_name IS NOT NULL THEN 'EXISTS' ELSE 'NOT_EXISTS' END as status
FROM information_schema.columns 
WHERE table_name = 'categories' 
AND column_name IN ('name_en', 'name_he', 'name_ar', 'description_en', 'description_he', 'description_ar');

-- 11. ПРОВЕРКА ТАБЛИЦЫ themes
SELECT 'THEMES_TABLE' as check_type,
       CASE 
           WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'themes') 
           THEN 'EXISTS' 
           ELSE 'NOT_EXISTS' 
       END as status;

-- 12. ПРОВЕРКА ТАБЛИЦЫ push_subscriptions
SELECT 'PUSH_SUBSCRIPTIONS_TABLE' as check_type,
       CASE 
           WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'push_subscriptions') 
           THEN 'EXISTS' 
           ELSE 'NOT_EXISTS' 
       END as status;

-- 13. ПРОВЕРКА ТАБЛИЦЫ marketing_notifications
SELECT 'MARKETING_NOTIFICATIONS_TABLE' as check_type,
       CASE 
           WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'marketing_notifications') 
           THEN 'EXISTS' 
           ELSE 'NOT_EXISTS' 
       END as status;

-- 14. КОЛИЧЕСТВО ЗАПИСЕЙ В ОСНОВНЫХ ТАБЛИЦАХ
SELECT 'RECORD_COUNTS' as check_type,
       'products' as table_name,
       COUNT(*) as record_count
FROM products
UNION ALL
SELECT 'RECORD_COUNTS' as check_type,
       'categories' as table_name,
       COUNT(*) as record_count
FROM categories
UNION ALL
SELECT 'RECORD_COUNTS' as check_type,
       'orders' as table_name,
       COUNT(*) as record_count  
FROM orders
UNION ALL
SELECT 'RECORD_COUNTS' as check_type,
       'users' as table_name,
       COUNT(*) as record_count
FROM users;

-- 15. ПРОВЕРКА КЛЮЧЕВЫХ НАСТРОЕК
SELECT 'KEY_SETTINGS' as check_type,
       store_name,
       default_language,
       enabled_languages,
       CASE WHEN worker_permissions ? 'canCreateOrders' THEN 'HAS_canCreateOrders' ELSE 'MISSING_canCreateOrders' END as create_orders_permission
FROM store_settings 
WHERE id = 1;

-- ===================================================================
-- ИНСТРУКЦИЯ ПО ИСПОЛЬЗОВАНИЮ:
-- ===================================================================
-- 1. Подключитесь к вашей продакшн базе данных:
--    psql -U your_user -h your_host -d your_database
-- 
-- 2. Скопируйте и выполните все команды выше
--
-- 3. Сохраните ВСЕ результаты в текстовый файл
--
-- 4. Отправьте мне результаты - я создам точный план миграции
-- ===================================================================
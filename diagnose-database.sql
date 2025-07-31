-- ДИАГНОСТИКА БАЗЫ ДАННЫХ
-- Этот скрипт поможет определить точно какие колонки отсутствуют

-- 1. Проверить существование таблицы store_settings
SELECT 
    'TABLE_CHECK' as check_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'store_settings')
        THEN 'EXISTS'
        ELSE 'MISSING'
    END as result;

-- 2. Показать все колонки в таблице store_settings
SELECT 
    'CURRENT_COLUMNS' as check_type,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'store_settings'
ORDER BY ordinal_position;

-- 3. Проверить критичные колонки, которые используются в коде
SELECT 
    'CRITICAL_COLUMNS_CHECK' as check_type,
    column_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'store_settings' AND column_name = column_name)
        THEN 'EXISTS'
        ELSE 'MISSING'
    END as status
FROM (VALUES 
    ('id'),
    ('store_name'),
    ('welcome_title'),
    ('store_description'),
    ('enabled_languages'),
    ('default_language'),
    ('worker_permissions'),
    ('pwa_name'),
    ('pwa_description')
) AS critical_columns(column_name);

-- 4. Попробовать базовый SELECT чтобы увидеть ошибку
SELECT 
    'BASIC_SELECT_TEST' as check_type,
    'Trying basic select...' as message;

-- Попробуем самый базовый запрос
SELECT id, store_name FROM store_settings LIMIT 1;
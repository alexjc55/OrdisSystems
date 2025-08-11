-- Экспорт схемы VPS базы данных
-- Выполнить на VPS сервере для получения текущей структуры

-- Экспорт всех колонок таблицы store_settings на VPS
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'store_settings'
ORDER BY ordinal_position;

-- Экспорт только колонок слайдера для сравнения
SELECT 
    column_name,
    data_type,
    column_default
FROM information_schema.columns 
WHERE table_name = 'store_settings' 
AND (column_name LIKE '%slider%' OR column_name LIKE '%slide%')
ORDER BY column_name;
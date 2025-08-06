-- Проверка всех колонок в store_settings таблице
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'store_settings' 
ORDER BY ordinal_position;

-- Проверка конкретно колонок слайдера
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'store_settings' 
AND (column_name LIKE '%slider%' OR column_name LIKE '%slide%')
ORDER BY column_name;
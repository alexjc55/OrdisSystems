-- Quick check of store_settings table schema on VPS
-- Run this to see what columns are missing

SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'store_settings' 
AND column_name LIKE '%slider%'
ORDER BY column_name;
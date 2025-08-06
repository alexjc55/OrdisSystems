-- ПОЛНАЯ МИГРАЦИЯ СЛАЙДЕРА ДЛЯ VPS СЕРВЕРА
-- Добавляет все 32 недостающие колонки слайдера на основе сравнения схем

BEGIN;

-- Основные настройки слайдера
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slider_speed INTEGER DEFAULT 5000;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slider_effect VARCHAR(10) DEFAULT 'fade';

-- Слайд 1 (6 колонок)
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slide1_image VARCHAR(500);
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slide1_title VARCHAR(255);
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slide1_subtitle TEXT;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slide1_button_text VARCHAR(100);
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slide1_button_link VARCHAR(500);
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slide1_text_position VARCHAR(20) DEFAULT 'left';

-- Слайд 2 (6 колонок)  
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slide2_image VARCHAR(500);
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slide2_title VARCHAR(255);
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slide2_subtitle TEXT;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slide2_button_text VARCHAR(100);
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slide2_button_link VARCHAR(500);
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slide2_text_position VARCHAR(20) DEFAULT 'left';

-- Слайд 3 (6 колонок)
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slide3_image VARCHAR(500);
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slide3_title VARCHAR(255);
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slide3_subtitle TEXT;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slide3_button_text VARCHAR(100);
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slide3_button_link VARCHAR(500);
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slide3_text_position VARCHAR(20) DEFAULT 'left';

-- Слайд 4 (6 колонок)
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slide4_image VARCHAR(500);
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slide4_title VARCHAR(255);
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slide4_subtitle TEXT;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slide4_button_text VARCHAR(100);
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slide4_button_link VARCHAR(500);
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slide4_text_position VARCHAR(20) DEFAULT 'left';

-- Слайд 5 (6 колонок)
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slide5_image VARCHAR(500);
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slide5_title VARCHAR(255);
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slide5_subtitle TEXT;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slide5_button_text VARCHAR(100);
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slide5_button_link VARCHAR(500);
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slide5_text_position VARCHAR(20) DEFAULT 'left';

-- Обновление существующих записей с правильными значениями по умолчанию
UPDATE store_settings 
SET 
    slider_autoplay = COALESCE(slider_autoplay, true),
    slider_speed = COALESCE(slider_speed, 5000),
    slider_effect = COALESCE(slider_effect, 'fade'),
    slide1_text_position = COALESCE(slide1_text_position, 'left'),
    slide2_text_position = COALESCE(slide2_text_position, 'left'),
    slide3_text_position = COALESCE(slide3_text_position, 'left'),
    slide4_text_position = COALESCE(slide4_text_position, 'left'),
    slide5_text_position = COALESCE(slide5_text_position, 'left')
WHERE id = 1;

COMMIT;

-- Проверка результата
SELECT 
    COUNT(*) as total_slider_columns,
    'Ожидается 33 колонки слайдера' as note
FROM information_schema.columns 
WHERE table_name = 'store_settings' 
AND (column_name LIKE '%slider%' OR column_name LIKE '%slide%');

-- Показать все добавленные колонки
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'store_settings' 
AND (column_name LIKE '%slider%' OR column_name LIKE '%slide%')
ORDER BY column_name;
-- Добавление ВСЕХ недостающих колонок для store_settings
-- Выполнить на VPS сервере

BEGIN;

-- Slider settings (основные настройки слайдера)
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slider_autoplay BOOLEAN DEFAULT true;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slider_speed INTEGER DEFAULT 5000;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slider_effect VARCHAR(10) DEFAULT 'fade';

-- Slide 1 settings
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slide1_image VARCHAR(500);
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slide1_title VARCHAR(255);
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slide1_subtitle TEXT;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slide1_button_text VARCHAR(100);
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slide1_button_link VARCHAR(500);
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slide1_text_position VARCHAR(20) DEFAULT 'left-center';

-- Slide 2 settings
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slide2_image VARCHAR(500);
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slide2_title VARCHAR(255);
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slide2_subtitle TEXT;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slide2_button_text VARCHAR(100);
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slide2_button_link VARCHAR(500);
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slide2_text_position VARCHAR(20) DEFAULT 'left-center';

-- Slide 3 settings
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slide3_image VARCHAR(500);
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slide3_title VARCHAR(255);
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slide3_subtitle TEXT;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slide3_button_text VARCHAR(100);
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slide3_button_link VARCHAR(500);
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slide3_text_position VARCHAR(20) DEFAULT 'left-center';

-- Обновить существующую запись значениями по умолчанию
UPDATE store_settings 
SET 
    slider_autoplay = COALESCE(slider_autoplay, true),
    slider_speed = COALESCE(slider_speed, 5000),
    slider_effect = COALESCE(slider_effect, 'fade'),
    slide1_text_position = COALESCE(slide1_text_position, 'left-center'),
    slide2_text_position = COALESCE(slide2_text_position, 'left-center'),
    slide3_text_position = COALESCE(slide3_text_position, 'left-center')
WHERE id = 1;

COMMIT;

-- Проверить результат
SELECT COUNT(*) as total_columns FROM information_schema.columns WHERE table_name = 'store_settings';
SELECT column_name FROM information_schema.columns WHERE table_name = 'store_settings' AND (column_name LIKE '%slider%' OR column_name LIKE '%slide%') ORDER BY column_name;
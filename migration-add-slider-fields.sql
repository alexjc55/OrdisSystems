-- Migration: Add slider fields to store_settings table
-- This migration adds the missing slider configuration fields to the store_settings table

-- Add slider autoplay setting (main field causing the error)
ALTER TABLE store_settings 
ADD COLUMN IF NOT EXISTS slider_autoplay BOOLEAN DEFAULT true;

-- Add slider speed setting
ALTER TABLE store_settings 
ADD COLUMN IF NOT EXISTS slider_speed INTEGER DEFAULT 5000;

-- Add slider effect setting
ALTER TABLE store_settings 
ADD COLUMN IF NOT EXISTS slider_effect VARCHAR(10) DEFAULT 'fade';

-- Add Slide 1 settings
ALTER TABLE store_settings 
ADD COLUMN IF NOT EXISTS slide1_image VARCHAR(500);

ALTER TABLE store_settings 
ADD COLUMN IF NOT EXISTS slide1_title VARCHAR(255);

ALTER TABLE store_settings 
ADD COLUMN IF NOT EXISTS slide1_subtitle TEXT;

ALTER TABLE store_settings 
ADD COLUMN IF NOT EXISTS slide1_button_text VARCHAR(100);

ALTER TABLE store_settings 
ADD COLUMN IF NOT EXISTS slide1_button_link VARCHAR(500);

ALTER TABLE store_settings 
ADD COLUMN IF NOT EXISTS slide1_text_position VARCHAR(20) DEFAULT 'left-center';

-- Add Slide 2 settings
ALTER TABLE store_settings 
ADD COLUMN IF NOT EXISTS slide2_image VARCHAR(500);

ALTER TABLE store_settings 
ADD COLUMN IF NOT EXISTS slide2_title VARCHAR(255);

ALTER TABLE store_settings 
ADD COLUMN IF NOT EXISTS slide2_subtitle TEXT;

ALTER TABLE store_settings 
ADD COLUMN IF NOT EXISTS slide2_button_text VARCHAR(100);

ALTER TABLE store_settings 
ADD COLUMN IF NOT EXISTS slide2_button_link VARCHAR(500);

ALTER TABLE store_settings 
ADD COLUMN IF NOT EXISTS slide2_text_position VARCHAR(20) DEFAULT 'left-center';

-- Add Slide 3 settings
ALTER TABLE store_settings 
ADD COLUMN IF NOT EXISTS slide3_image VARCHAR(500);

ALTER TABLE store_settings 
ADD COLUMN IF NOT EXISTS slide3_title VARCHAR(255);

ALTER TABLE store_settings 
ADD COLUMN IF NOT EXISTS slide3_subtitle TEXT;

ALTER TABLE store_settings 
ADD COLUMN IF NOT EXISTS slide3_button_text VARCHAR(100);

ALTER TABLE store_settings 
ADD COLUMN IF NOT EXISTS slide3_button_link VARCHAR(500);

ALTER TABLE store_settings 
ADD COLUMN IF NOT EXISTS slide3_text_position VARCHAR(20) DEFAULT 'left-center';

-- Update existing store settings record with default values if it exists
UPDATE store_settings 
SET 
    slider_autoplay = COALESCE(slider_autoplay, true),
    slider_speed = COALESCE(slider_speed, 5000),
    slider_effect = COALESCE(slider_effect, 'fade'),
    slide1_text_position = COALESCE(slide1_text_position, 'left-center'),
    slide2_text_position = COALESCE(slide2_text_position, 'left-center'),
    slide3_text_position = COALESCE(slide3_text_position, 'left-center')
WHERE id = 1;

-- Verify the migration was successful
SELECT COUNT(*) as slider_fields_added FROM information_schema.columns 
WHERE table_name = 'store_settings' 
AND column_name IN ('slider_autoplay', 'slider_speed', 'slider_effect');

COMMIT;
-- Add multilingual logo and banner fields to store_settings table
-- This migration adds fields for English, Hebrew, and Arabic logo/banner URLs

-- Add multilingual logo fields
ALTER TABLE store_settings 
ADD COLUMN IF NOT EXISTS logo_url_en VARCHAR(500) DEFAULT '',
ADD COLUMN IF NOT EXISTS logo_url_he VARCHAR(500) DEFAULT '',
ADD COLUMN IF NOT EXISTS logo_url_ar VARCHAR(500) DEFAULT '';

-- Add multilingual banner fields
ALTER TABLE store_settings 
ADD COLUMN IF NOT EXISTS banner_image_url_en VARCHAR(500) DEFAULT '',
ADD COLUMN IF NOT EXISTS banner_image_url_he VARCHAR(500) DEFAULT '',
ADD COLUMN IF NOT EXISTS banner_image_url_ar VARCHAR(500) DEFAULT '';

-- Add multilingual cart banner fields
ALTER TABLE store_settings 
ADD COLUMN IF NOT EXISTS cart_banner_image_en VARCHAR(500) DEFAULT '',
ADD COLUMN IF NOT EXISTS cart_banner_image_he VARCHAR(500) DEFAULT '',
ADD COLUMN IF NOT EXISTS cart_banner_image_ar VARCHAR(500) DEFAULT '';

-- Add multilingual PWA icon fields
ALTER TABLE store_settings 
ADD COLUMN IF NOT EXISTS pwa_icon_en VARCHAR(500) DEFAULT '',
ADD COLUMN IF NOT EXISTS pwa_icon_he VARCHAR(500) DEFAULT '',
ADD COLUMN IF NOT EXISTS pwa_icon_ar VARCHAR(500) DEFAULT '';

-- Update existing themes table if needed
ALTER TABLE themes 
ADD COLUMN IF NOT EXISTS logo_url_en VARCHAR(500) DEFAULT '',
ADD COLUMN IF NOT EXISTS logo_url_he VARCHAR(500) DEFAULT '',
ADD COLUMN IF NOT EXISTS logo_url_ar VARCHAR(500) DEFAULT '',
ADD COLUMN IF NOT EXISTS banner_image_url_en VARCHAR(500) DEFAULT '',
ADD COLUMN IF NOT EXISTS banner_image_url_he VARCHAR(500) DEFAULT '',
ADD COLUMN IF NOT EXISTS banner_image_url_ar VARCHAR(500) DEFAULT '';
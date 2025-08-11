-- PRODUCTION DATABASE UPDATE SCRIPT
-- Adds missing columns to synchronize production database with current schema
-- Execute this on the production server: psql -U edahouse_usr -h localhost -d edahouse -f production-database-update.sql

-- Add missing columns to store_settings table if they don't exist
DO $$
BEGIN
    -- PWA fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_settings' AND column_name='pwa_icon') THEN
        ALTER TABLE store_settings ADD COLUMN pwa_icon VARCHAR(500);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_settings' AND column_name='pwa_name') THEN
        ALTER TABLE store_settings ADD COLUMN pwa_name VARCHAR(100) DEFAULT 'eDAHouse';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_settings' AND column_name='pwa_description') THEN
        ALTER TABLE store_settings ADD COLUMN pwa_description TEXT DEFAULT 'Готовые блюда с доставкой';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_settings' AND column_name='pwa_name_en') THEN
        ALTER TABLE store_settings ADD COLUMN pwa_name_en VARCHAR(100);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_settings' AND column_name='pwa_description_en') THEN
        ALTER TABLE store_settings ADD COLUMN pwa_description_en TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_settings' AND column_name='pwa_name_he') THEN
        ALTER TABLE store_settings ADD COLUMN pwa_name_he VARCHAR(100);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_settings' AND column_name='pwa_description_he') THEN
        ALTER TABLE store_settings ADD COLUMN pwa_description_he TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_settings' AND column_name='pwa_name_ar') THEN
        ALTER TABLE store_settings ADD COLUMN pwa_name_ar VARCHAR(100);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_settings' AND column_name='pwa_description_ar') THEN
        ALTER TABLE store_settings ADD COLUMN pwa_description_ar TEXT;
    END IF;
    
    -- Modern blocks fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_settings' AND column_name='modern_block1_icon') THEN
        ALTER TABLE store_settings ADD COLUMN modern_block1_icon VARCHAR(50);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_settings' AND column_name='modern_block1_text') THEN
        ALTER TABLE store_settings ADD COLUMN modern_block1_text VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_settings' AND column_name='modern_block2_icon') THEN
        ALTER TABLE store_settings ADD COLUMN modern_block2_icon VARCHAR(50);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_settings' AND column_name='modern_block2_text') THEN
        ALTER TABLE store_settings ADD COLUMN modern_block2_text VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_settings' AND column_name='modern_block3_icon') THEN
        ALTER TABLE store_settings ADD COLUMN modern_block3_icon VARCHAR(50);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_settings' AND column_name='modern_block3_text') THEN
        ALTER TABLE store_settings ADD COLUMN modern_block3_text VARCHAR(255);
    END IF;
    
    -- Language-specific fields for Arabic
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_settings' AND column_name='store_name_ar') THEN
        ALTER TABLE store_settings ADD COLUMN store_name_ar VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_settings' AND column_name='welcome_title_ar') THEN
        ALTER TABLE store_settings ADD COLUMN welcome_title_ar VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_settings' AND column_name='store_description_ar') THEN
        ALTER TABLE store_settings ADD COLUMN store_description_ar TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_settings' AND column_name='delivery_info_ar') THEN
        ALTER TABLE store_settings ADD COLUMN delivery_info_ar TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_settings' AND column_name='about_text_ar') THEN
        ALTER TABLE store_settings ADD COLUMN about_text_ar TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_settings' AND column_name='banner_button_text_ar') THEN
        ALTER TABLE store_settings ADD COLUMN banner_button_text_ar VARCHAR(100);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_settings' AND column_name='discount_badge_text_ar') THEN
        ALTER TABLE store_settings ADD COLUMN discount_badge_text_ar VARCHAR(50);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_settings' AND column_name='whatsapp_default_message_ar') THEN
        ALTER TABLE store_settings ADD COLUMN whatsapp_default_message_ar TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_settings' AND column_name='cart_banner_text_ar') THEN
        ALTER TABLE store_settings ADD COLUMN cart_banner_text_ar TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_settings' AND column_name='payment_info_ar') THEN
        ALTER TABLE store_settings ADD COLUMN payment_info_ar TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_settings' AND column_name='contact_phone_ar') THEN
        ALTER TABLE store_settings ADD COLUMN contact_phone_ar VARCHAR(50);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_settings' AND column_name='contact_email_ar') THEN
        ALTER TABLE store_settings ADD COLUMN contact_email_ar VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_settings' AND column_name='address_ar') THEN
        ALTER TABLE store_settings ADD COLUMN address_ar TEXT;
    END IF;
    
    -- Language-specific fields for Hebrew
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_settings' AND column_name='store_name_he') THEN
        ALTER TABLE store_settings ADD COLUMN store_name_he VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_settings' AND column_name='welcome_title_he') THEN
        ALTER TABLE store_settings ADD COLUMN welcome_title_he VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_settings' AND column_name='store_description_he') THEN
        ALTER TABLE store_settings ADD COLUMN store_description_he TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_settings' AND column_name='delivery_info_he') THEN
        ALTER TABLE store_settings ADD COLUMN delivery_info_he TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_settings' AND column_name='about_text_he') THEN
        ALTER TABLE store_settings ADD COLUMN about_text_he TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_settings' AND column_name='banner_button_text_he') THEN
        ALTER TABLE store_settings ADD COLUMN banner_button_text_he VARCHAR(100);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_settings' AND column_name='discount_badge_text_he') THEN
        ALTER TABLE store_settings ADD COLUMN discount_badge_text_he VARCHAR(50);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_settings' AND column_name='whatsapp_default_message_he') THEN
        ALTER TABLE store_settings ADD COLUMN whatsapp_default_message_he TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_settings' AND column_name='cart_banner_text_he') THEN
        ALTER TABLE store_settings ADD COLUMN cart_banner_text_he TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_settings' AND column_name='payment_info_he') THEN
        ALTER TABLE store_settings ADD COLUMN payment_info_he TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_settings' AND column_name='contact_phone_he') THEN
        ALTER TABLE store_settings ADD COLUMN contact_phone_he VARCHAR(50);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_settings' AND column_name='contact_email_he') THEN
        ALTER TABLE store_settings ADD COLUMN contact_email_he VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_settings' AND column_name='address_he') THEN
        ALTER TABLE store_settings ADD COLUMN address_he TEXT;
    END IF;
    
    -- Language-specific fields for English
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_settings' AND column_name='store_name_en') THEN
        ALTER TABLE store_settings ADD COLUMN store_name_en VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_settings' AND column_name='welcome_title_en') THEN
        ALTER TABLE store_settings ADD COLUMN welcome_title_en VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_settings' AND column_name='store_description_en') THEN
        ALTER TABLE store_settings ADD COLUMN store_description_en TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_settings' AND column_name='delivery_info_en') THEN
        ALTER TABLE store_settings ADD COLUMN delivery_info_en TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_settings' AND column_name='about_text_en') THEN
        ALTER TABLE store_settings ADD COLUMN about_text_en TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_settings' AND column_name='banner_button_text_en') THEN
        ALTER TABLE store_settings ADD COLUMN banner_button_text_en VARCHAR(100);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_settings' AND column_name='discount_badge_text_en') THEN
        ALTER TABLE store_settings ADD COLUMN discount_badge_text_en VARCHAR(50);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_settings' AND column_name='whatsapp_default_message_en') THEN
        ALTER TABLE store_settings ADD COLUMN whatsapp_default_message_en TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_settings' AND column_name='cart_banner_text_en') THEN
        ALTER TABLE store_settings ADD COLUMN cart_banner_text_en TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_settings' AND column_name='payment_info_en') THEN
        ALTER TABLE store_settings ADD COLUMN payment_info_en TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_settings' AND column_name='contact_phone_en') THEN
        ALTER TABLE store_settings ADD COLUMN contact_phone_en VARCHAR(50);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_settings' AND column_name='contact_email_en') THEN
        ALTER TABLE store_settings ADD COLUMN contact_email_en VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_settings' AND column_name='address_en') THEN
        ALTER TABLE store_settings ADD COLUMN address_en TEXT;
    END IF;
    
    -- Russian base language fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_settings' AND column_name='about_text_ru') THEN
        ALTER TABLE store_settings ADD COLUMN about_text_ru TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_settings' AND column_name='banner_button_text_ru') THEN
        ALTER TABLE store_settings ADD COLUMN banner_button_text_ru VARCHAR(100);
    END IF;
    
    RAISE NOTICE 'Successfully added missing columns to store_settings table';
END $$;

-- Verify the update was successful
SELECT 'Database update completed successfully. Missing columns have been added.' as status;
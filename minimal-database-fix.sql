-- MINIMAL DATABASE FIX - Only most critical missing columns
-- Execute: psql -U demo_ordis_usr -h localhost -d demo_ordis -f minimal-database-fix.sql

-- Add only the most essential missing columns that cause the /api/settings error
DO $$
BEGIN
    -- Check if store_settings table exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='store_settings') THEN
        RAISE EXCEPTION 'store_settings table does not exist';
    END IF;

    -- Add minimal required columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_settings' AND column_name='enabled_languages') THEN
        ALTER TABLE store_settings ADD COLUMN enabled_languages JSONB DEFAULT '["ru", "en", "he", "ar"]';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_settings' AND column_name='default_language') THEN
        ALTER TABLE store_settings ADD COLUMN default_language VARCHAR(5) DEFAULT 'ru';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_settings' AND column_name='worker_permissions') THEN
        ALTER TABLE store_settings ADD COLUMN worker_permissions JSONB DEFAULT '{"canManageProducts": true, "canManageCategories": true, "canManageOrders": true, "canViewUsers": false, "canManageUsers": false, "canViewSettings": false, "canManageSettings": false, "canManageThemes": false, "canCreateOrders": true}';
    END IF;

    RAISE NOTICE 'Minimal database fix completed successfully';
END $$;

-- Verify critical columns exist
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'store_settings' 
AND column_name IN ('enabled_languages', 'default_language', 'worker_permissions')
ORDER BY column_name;
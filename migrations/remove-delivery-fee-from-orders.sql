-- Migration: Remove delivery_fee column from orders table
-- Date: January 6, 2025
-- Reason: Delivery fee is now calculated dynamically based on store settings
-- 
-- This migration removes the delivery_fee column from the orders table
-- since delivery costs are now calculated dynamically from store_settings
-- rather than being stored with each individual order.

-- Check if the column exists before attempting to drop it
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND column_name = 'delivery_fee'
    ) THEN
        -- Drop the delivery_fee column
        ALTER TABLE orders DROP COLUMN delivery_fee;
        RAISE NOTICE 'Column delivery_fee has been removed from orders table';
    ELSE
        RAISE NOTICE 'Column delivery_fee does not exist in orders table - no action needed';
    END IF;
END $$;

-- Verify the column has been removed
SELECT 'Migration completed successfully. Delivery fee column status:' as status;
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN 'delivery_fee column successfully removed'
        ELSE 'delivery_fee column still exists - check for errors'
    END as result
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND column_name = 'delivery_fee';
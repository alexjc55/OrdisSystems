-- Migration: Add Barcode Scanning System
-- Date: 2025-07-17
-- Description: Adds barcode scanning functionality with configuration table and product barcode fields

BEGIN;

-- Create barcode_config table for storing barcode parsing configuration
CREATE TABLE IF NOT EXISTS barcode_config (
    id SERIAL PRIMARY KEY,
    enabled BOOLEAN NOT NULL DEFAULT true,
    product_code_start INTEGER NOT NULL DEFAULT 2,
    product_code_end INTEGER NOT NULL DEFAULT 7,
    weight_start INTEGER NOT NULL DEFAULT 8,
    weight_end INTEGER NOT NULL DEFAULT 13,
    weight_unit VARCHAR(10) NOT NULL DEFAULT 'g',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default barcode configuration for Israeli barcodes
INSERT INTO barcode_config (enabled, product_code_start, product_code_end, weight_start, weight_end, weight_unit)
VALUES (true, 2, 7, 8, 13, 'g')
ON CONFLICT (id) DO NOTHING;

-- Add barcode field to products table if it doesn't exist
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS barcode VARCHAR(50);

-- Create index on barcode field for faster lookups
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);

-- Add barcode field to products table for multilingual support
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS barcode_en VARCHAR(50),
ADD COLUMN IF NOT EXISTS barcode_he VARCHAR(50),
ADD COLUMN IF NOT EXISTS barcode_ar VARCHAR(50);

-- Create indexes for multilingual barcode fields
CREATE INDEX IF NOT EXISTS idx_products_barcode_en ON products(barcode_en);
CREATE INDEX IF NOT EXISTS idx_products_barcode_he ON products(barcode_he);
CREATE INDEX IF NOT EXISTS idx_products_barcode_ar ON products(barcode_ar);

-- Update existing products with sample barcodes for testing
UPDATE products 
SET barcode = '025874'
WHERE name = 'Абжерка' AND barcode IS NULL;

UPDATE products 
SET barcode = '025875'
WHERE name LIKE '%салат%' AND barcode IS NULL AND id != (SELECT id FROM products WHERE name = 'Абжерка' LIMIT 1);

-- Add weight tracking fields to order_items for barcode scanning
ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS scanned_weight INTEGER,
ADD COLUMN IF NOT EXISTS is_weight_scanned BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS barcode_used VARCHAR(50);

-- Create audit log table for barcode scanning activities
CREATE TABLE IF NOT EXISTS barcode_scan_log (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    barcode_scanned VARCHAR(100) NOT NULL,
    weight_detected INTEGER,
    scan_timestamp TIMESTAMP DEFAULT NOW(),
    user_id VARCHAR(50),
    scan_result VARCHAR(20) CHECK (scan_result IN ('success', 'product_not_found', 'invalid_format', 'error'))
);

-- Create index for audit log queries
CREATE INDEX IF NOT EXISTS idx_barcode_scan_log_order_id ON barcode_scan_log(order_id);
CREATE INDEX IF NOT EXISTS idx_barcode_scan_log_timestamp ON barcode_scan_log(scan_timestamp);

COMMIT;
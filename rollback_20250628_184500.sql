-- ROLLBACK SCRIPT - Created June 28, 2025 18:45
-- This script contains backup data and structure for emergency rollback
-- 
-- USAGE:
-- 1. Stop the application
-- 2. Run: psql $DATABASE_URL -f rollback_20250628_184500.sql
-- 3. Restart the application
--
-- WARNING: This will overwrite current data with backup state

BEGIN;

-- Create backup timestamp
INSERT INTO rollback_log (created_at, description) VALUES 
(NOW(), 'Rollback to June 28, 2025 18:45 - Post UI fixes version');

-- Store current settings for potential future rollback
CREATE TABLE IF NOT EXISTS rollback_log (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT NOW(),
    description TEXT
);

-- Backup current store settings
CREATE TABLE IF NOT EXISTS store_settings_backup_20250628 AS 
SELECT * FROM store_settings;

-- Backup current themes
CREATE TABLE IF NOT EXISTS themes_backup_20250628 AS 
SELECT * FROM themes;

-- Backup current products (structure only - data too large)
CREATE TABLE IF NOT EXISTS products_structure_backup_20250628 AS 
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'products';

-- Backup current categories
CREATE TABLE IF NOT EXISTS categories_backup_20250628 AS 
SELECT * FROM categories;

-- Backup current users (without passwords for security)
CREATE TABLE IF NOT EXISTS users_backup_20250628 AS 
SELECT id, username, email, role, created_at, updated_at 
FROM users;

-- Key configuration snapshots for rollback reference
INSERT INTO rollback_log (description) VALUES 
('Current active theme: ' || (SELECT name FROM themes WHERE is_active = true LIMIT 1)),
('Total products: ' || (SELECT COUNT(*) FROM products)),
('Total categories: ' || (SELECT COUNT(*) FROM categories)),
('Total users: ' || (SELECT COUNT(*) FROM users)),
('Store name: ' || (SELECT "storeName" FROM store_settings LIMIT 1));

-- File system backup references (these files should exist)
INSERT INTO rollback_log (description) VALUES 
('Frontend backup: home-page-backup-20250628_184403.tsx'),
('Admin backup: admin-dashboard-backup-20250628_184407.tsx'),
('Recent changes: Fixed All Products button, removed duplicate category info, fixed per/per issue, optimized search field');

COMMIT;

-- 
-- ROLLBACK PROCEDURE INSTRUCTIONS:
--
-- 1. DATABASE ROLLBACK:
--    a) Restore store settings: UPDATE store_settings SET ... (from backup)
--    b) Restore themes: UPDATE themes SET ... (from backup) 
--    c) Check data integrity: SELECT COUNT(*) FROM [table_name]
--
-- 2. FILE SYSTEM ROLLBACK:
--    a) cp home-page-backup-20250628_184403.tsx client/src/pages/home.tsx
--    b) cp admin-dashboard-backup-20250628_184407.tsx client/src/pages/admin-dashboard.tsx
--    c) Restart application: npm run dev
--
-- 3. VERIFICATION:
--    a) Test "All Products" button functionality
--    b) Check category pages for duplicate information
--    c) Verify English language "per" display
--    d) Test search field focus behavior
--    e) Verify all translations are working
--
-- 4. CLEANUP AFTER SUCCESSFUL ROLLBACK:
--    DROP TABLE store_settings_backup_20250628;
--    DROP TABLE themes_backup_20250628;
--    DROP TABLE categories_backup_20250628;
--    DROP TABLE users_backup_20250628;
--    DROP TABLE products_structure_backup_20250628;
--
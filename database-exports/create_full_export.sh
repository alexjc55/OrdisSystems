#!/bin/bash

# Экспорт всех данных из Replit
echo "-- Полный экспорт данных из Replit для загрузки на VPS" > database-exports/complete_data_export.sql
echo "-- Сгенерировано автоматически $(date)" >> database-exports/complete_data_export.sql
echo "" >> database-exports/complete_data_export.sql

# Экспорт категорий
echo "-- Категории" >> database-exports/complete_data_export.sql
psql $DATABASE_URL -t -c "
SELECT 
    'INSERT INTO categories (id, name, name_en, name_he, name_ar, description, description_en, description_he, description_ar, icon, is_active, sort_order, created_at, updated_at) VALUES (' ||
    id || ', ' ||
    COALESCE('''' || REPLACE(name, '''', '''''') || '''', 'NULL') || ', ' ||
    COALESCE('''' || REPLACE(name_en, '''', '''''') || '''', 'NULL') || ', ' ||
    COALESCE('''' || REPLACE(name_he, '''', '''''') || '''', 'NULL') || ', ' ||
    COALESCE('''' || REPLACE(name_ar, '''', '''''') || '''', 'NULL') || ', ' ||
    COALESCE('''' || REPLACE(description, '''', '''''') || '''', 'NULL') || ', ' ||
    COALESCE('''' || REPLACE(description_en, '''', '''''') || '''', 'NULL') || ', ' ||
    COALESCE('''' || REPLACE(description_he, '''', '''''') || '''', 'NULL') || ', ' ||
    COALESCE('''' || REPLACE(description_ar, '''', '''''') || '''', 'NULL') || ', ' ||
    COALESCE('''' || REPLACE(icon, '''', '''''') || '''', 'NULL') || ', ' ||
    is_active || ', ' ||
    COALESCE(sort_order::text, '0') || ', ' ||
    COALESCE('''' || created_at::text || '''', 'NOW()') || ', ' ||
    COALESCE('''' || updated_at::text || '''', 'NOW()') ||
    ') ON CONFLICT (id) DO NOTHING;'
FROM categories
ORDER BY id;
" >> database-exports/complete_data_export.sql

echo "" >> database-exports/complete_data_export.sql
echo "-- Продукты" >> database-exports/complete_data_export.sql

# Экспорт продуктов
psql $DATABASE_URL -t -c "
SELECT 
    'INSERT INTO products (id, name, name_en, name_he, name_ar, description, description_en, description_he, description_ar, price, price_per_kg, image_url, unit, is_active, availability_status, is_special_offer, discount_type, discount_value, sort_order, created_at, updated_at) VALUES (' ||
    id || ', ' ||
    COALESCE('''' || REPLACE(name, '''', '''''') || '''', 'NULL') || ', ' ||
    COALESCE('''' || REPLACE(name_en, '''', '''''') || '''', 'NULL') || ', ' ||
    COALESCE('''' || REPLACE(name_he, '''', '''''') || '''', 'NULL') || ', ' ||
    COALESCE('''' || REPLACE(name_ar, '''', '''''') || '''', 'NULL') || ', ' ||
    COALESCE('''' || REPLACE(description, '''', '''''') || '''', 'NULL') || ', ' ||
    COALESCE('''' || REPLACE(description_en, '''', '''''') || '''', 'NULL') || ', ' ||
    COALESCE('''' || REPLACE(description_he, '''', '''''') || '''', 'NULL') || ', ' ||
    COALESCE('''' || REPLACE(description_ar, '''', '''''') || '''', 'NULL') || ', ' ||
    COALESCE(price::text, 'NULL') || ', ' ||
    COALESCE(price_per_kg::text, 'NULL') || ', ' ||
    COALESCE('''' || REPLACE(image_url, '''', '''''') || '''', 'NULL') || ', ' ||
    COALESCE('''' || REPLACE(unit, '''', '''''') || '''', 'NULL') || ', ' ||
    is_active || ', ' ||
    COALESCE('''' || availability_status || '''', '''available''') || ', ' ||
    COALESCE(is_special_offer::text, 'false') || ', ' ||
    COALESCE('''' || discount_type || '''', 'NULL') || ', ' ||
    COALESCE(discount_value::text, 'NULL') || ', ' ||
    COALESCE(sort_order::text, '0') || ', ' ||
    COALESCE('''' || created_at::text || '''', 'NOW()') || ', ' ||
    COALESCE('''' || updated_at::text || '''', 'NOW()') ||
    ') ON CONFLICT (id) DO NOTHING;'
FROM products
ORDER BY id;
" >> database-exports/complete_data_export.sql

echo "" >> database-exports/complete_data_export.sql
echo "-- Настройки магазина" >> database-exports/complete_data_export.sql

# Экспорт настроек магазина
psql $DATABASE_URL -t -c "
SELECT 
    'INSERT INTO store_settings (id, store_name, store_name_en, store_name_he, store_name_ar, welcome_title, welcome_title_en, welcome_title_he, welcome_title_ar, welcome_subtitle, welcome_subtitle_en, welcome_subtitle_he, welcome_subtitle_ar, phone, email, address, is_store_open, delivery_fee, min_order_amount, max_delivery_distance, estimated_delivery_time, working_hours, payment_methods, delivery_info, store_logo_url, header_banner_url, cart_banner_text, cart_banner_link, cart_banner_bg_color, cart_banner_text_color, bottom_banner_text, bottom_banner_link, bottom_banner_bg_color, bottom_banner_text_color, bottom_banner_image_url, show_banner, show_title_description, show_category_menu, show_info_blocks, show_special_offers, show_whatsapp_chat, info_blocks_position, whatsapp_phone, whatsapp_default_message, created_at, updated_at) VALUES (' ||
    COALESCE(id::text, '1') || ', ' ||
    COALESCE('''' || REPLACE(store_name, '''', '''''') || '''', '''eDAHouse''') || ', ' ||
    COALESCE('''' || REPLACE(store_name_en, '''', '''''') || '''', 'NULL') || ', ' ||
    COALESCE('''' || REPLACE(store_name_he, '''', '''''') || '''', 'NULL') || ', ' ||
    COALESCE('''' || REPLACE(store_name_ar, '''', '''''') || '''', 'NULL') || ', ' ||
    COALESCE('''' || REPLACE(welcome_title, '''', '''''') || '''', '''Добро пожаловать''') || ', ' ||
    COALESCE('''' || REPLACE(welcome_title_en, '''', '''''') || '''', 'NULL') || ', ' ||
    COALESCE('''' || REPLACE(welcome_title_he, '''', '''''') || '''', 'NULL') || ', ' ||
    COALESCE('''' || REPLACE(welcome_title_ar, '''', '''''') || '''', 'NULL') || ', ' ||
    COALESCE('''' || REPLACE(welcome_subtitle, '''', '''''') || '''', '''Доставка готовой еды''') || ', ' ||
    COALESCE('''' || REPLACE(welcome_subtitle_en, '''', '''''') || '''', 'NULL') || ', ' ||
    COALESCE('''' || REPLACE(welcome_subtitle_he, '''', '''''') || '''', 'NULL') || ', ' ||
    COALESCE('''' || REPLACE(welcome_subtitle_ar, '''', '''''') || '''', 'NULL') || ', ' ||
    COALESCE('''' || REPLACE(phone, '''', '''''') || '''', 'NULL') || ', ' ||
    COALESCE('''' || REPLACE(email, '''', '''''') || '''', 'NULL') || ', ' ||
    COALESCE('''' || REPLACE(address, '''', '''''') || '''', 'NULL') || ', ' ||
    COALESCE(is_store_open::text, 'true') || ', ' ||
    COALESCE(delivery_fee::text, '0') || ', ' ||
    COALESCE(min_order_amount::text, '0') || ', ' ||
    COALESCE(max_delivery_distance::text, '10') || ', ' ||
    COALESCE(estimated_delivery_time::text, '30') || ', ' ||
    COALESCE('''' || REPLACE(working_hours::text, '''', '''''') || '''', 'NULL') || ', ' ||
    COALESCE('''' || REPLACE(payment_methods::text, '''', '''''') || '''', 'NULL') || ', ' ||
    COALESCE('''' || REPLACE(delivery_info, '''', '''''') || '''', 'NULL') || ', ' ||
    COALESCE('''' || REPLACE(store_logo_url, '''', '''''') || '''', 'NULL') || ', ' ||
    COALESCE('''' || REPLACE(header_banner_url, '''', '''''') || '''', 'NULL') || ', ' ||
    COALESCE('''' || REPLACE(cart_banner_text, '''', '''''') || '''', 'NULL') || ', ' ||
    COALESCE('''' || REPLACE(cart_banner_link, '''', '''''') || '''', 'NULL') || ', ' ||
    COALESCE('''' || REPLACE(cart_banner_bg_color, '''', '''''') || '''', 'NULL') || ', ' ||
    COALESCE('''' || REPLACE(cart_banner_text_color, '''', '''''') || '''', 'NULL') || ', ' ||
    COALESCE('''' || REPLACE(bottom_banner_text, '''', '''''') || '''', 'NULL') || ', ' ||
    COALESCE('''' || REPLACE(bottom_banner_link, '''', '''''') || '''', 'NULL') || ', ' ||
    COALESCE('''' || REPLACE(bottom_banner_bg_color, '''', '''''') || '''', 'NULL') || ', ' ||
    COALESCE('''' || REPLACE(bottom_banner_text_color, '''', '''''') || '''', 'NULL') || ', ' ||
    COALESCE('''' || REPLACE(bottom_banner_image_url, '''', '''''') || '''', 'NULL') || ', ' ||
    COALESCE(show_banner::text, 'true') || ', ' ||
    COALESCE(show_title_description::text, 'true') || ', ' ||
    COALESCE(show_category_menu::text, 'true') || ', ' ||
    COALESCE(show_info_blocks::text, 'true') || ', ' ||
    COALESCE(show_special_offers::text, 'true') || ', ' ||
    COALESCE(show_whatsapp_chat::text, 'true') || ', ' ||
    COALESCE('''' || info_blocks_position || '''', '''top''') || ', ' ||
    COALESCE('''' || REPLACE(whatsapp_phone, '''', '''''') || '''', 'NULL') || ', ' ||
    COALESCE('''' || REPLACE(whatsapp_default_message, '''', '''''') || '''', 'NULL') || ', ' ||
    COALESCE('''' || created_at::text || '''', 'NOW()') || ', ' ||
    COALESCE('''' || updated_at::text || '''', 'NOW()') ||
    ') ON CONFLICT (id) DO NOTHING;'
FROM store_settings
LIMIT 1;
" >> database-exports/complete_data_export.sql

echo "" >> database-exports/complete_data_export.sql
echo "-- Обновление последовательностей" >> database-exports/complete_data_export.sql
echo "SELECT setval('categories_id_seq', (SELECT COALESCE(MAX(id), 1) FROM categories));" >> database-exports/complete_data_export.sql
echo "SELECT setval('products_id_seq', (SELECT COALESCE(MAX(id), 1) FROM products));" >> database-exports/complete_data_export.sql

echo "Создан полный экспорт: complete_data_export.sql"

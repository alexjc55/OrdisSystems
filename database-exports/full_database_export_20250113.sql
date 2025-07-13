-- Full Database Export - eDAHouse
-- Export Date: January 13, 2025
-- Export Time: 10:08 AM
-- Database: Complete structure and data

-- ============================================
-- DROP EXISTING TABLES (for clean import)
-- ============================================

DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS user_addresses CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS product_categories CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS marketing_notifications CASCADE;
DROP TABLE IF EXISTS push_subscriptions CASCADE;
DROP TABLE IF EXISTS themes CASCADE;
DROP TABLE IF EXISTS store_settings CASCADE;

-- ============================================
-- CREATE TABLES STRUCTURE
-- ============================================

-- Store Settings Table
CREATE TABLE store_settings (
    id SERIAL PRIMARY KEY,
    store_name VARCHAR(255) NOT NULL DEFAULT 'eDAHouse',
    welcome_title TEXT,
    store_description TEXT,
    contact_phone VARCHAR(50),
    contact_email VARCHAR(255),
    address TEXT,
    working_hours JSONB DEFAULT '{}',
    delivery_info TEXT,
    payment_methods JSONB DEFAULT '[]',
    logo_url TEXT,
    banner_image_url TEXT,
    banner_button_text VARCHAR(255),
    banner_button_link TEXT,
    delivery_fee DECIMAL(10,2) DEFAULT 0,
    free_delivery_threshold DECIMAL(10,2) DEFAULT 0,
    is_store_open BOOLEAN DEFAULT true,
    discount_badge_text VARCHAR(255),
    whatsapp_phone VARCHAR(50),
    whatsapp_message TEXT,
    show_banner BOOLEAN DEFAULT true,
    show_title_description BOOLEAN DEFAULT true,
    show_category_menu BOOLEAN DEFAULT true,
    show_info_blocks BOOLEAN DEFAULT true,
    show_special_offers BOOLEAN DEFAULT true,
    show_whatsapp_chat BOOLEAN DEFAULT false,
    info_blocks_position VARCHAR(20) DEFAULT 'top',
    cart_banner_type VARCHAR(10) DEFAULT 'text',
    cart_banner_text VARCHAR(255),
    cart_banner_image_url TEXT,
    cart_banner_color VARCHAR(7) DEFAULT '#f97316',
    bottom_banner1_text VARCHAR(255),
    bottom_banner1_link TEXT,
    bottom_banner1_image_url TEXT,
    bottom_banner2_text VARCHAR(255),
    bottom_banner2_link TEXT,
    bottom_banner2_image_url TEXT,
    default_language VARCHAR(5) DEFAULT 'ru',
    -- Multilingual fields
    store_name_en VARCHAR(255),
    store_name_he VARCHAR(255),
    store_name_ar VARCHAR(255),
    welcome_title_en TEXT,
    welcome_title_he TEXT,
    welcome_title_ar TEXT,
    store_description_en TEXT,
    store_description_he TEXT,
    store_description_ar TEXT,
    contact_phone_en VARCHAR(50),
    contact_phone_he VARCHAR(50),
    contact_phone_ar VARCHAR(50),
    contact_email_en VARCHAR(255),
    contact_email_he VARCHAR(255),
    contact_email_ar VARCHAR(255),
    address_en TEXT,
    address_he TEXT,
    address_ar TEXT,
    delivery_info_en TEXT,
    delivery_info_he TEXT,
    delivery_info_ar TEXT,
    payment_methods_en JSONB DEFAULT '[]',
    payment_methods_he JSONB DEFAULT '[]',
    payment_methods_ar JSONB DEFAULT '[]',
    logo_url_en TEXT,
    logo_url_he TEXT,
    logo_url_ar TEXT,
    banner_image_url_en TEXT,
    banner_image_url_he TEXT,
    banner_image_url_ar TEXT,
    cart_banner_image_en TEXT,
    cart_banner_image_he TEXT,
    cart_banner_image_ar TEXT,
    pwa_icon_en TEXT,
    pwa_icon_he TEXT,
    pwa_icon_ar TEXT,
    header_style VARCHAR(20) DEFAULT 'classic',
    modern_block1_icon VARCHAR(50),
    modern_block1_text VARCHAR(255),
    modern_block2_icon VARCHAR(50),
    modern_block2_text VARCHAR(255),
    modern_block3_icon VARCHAR(50),
    modern_block3_text VARCHAR(255)
);

-- Categories Table
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    name_en VARCHAR(255),
    name_he VARCHAR(255),
    name_ar VARCHAR(255),
    description TEXT,
    description_en TEXT,
    description_he TEXT,
    description_ar TEXT,
    icon VARCHAR(255),
    display_order INTEGER DEFAULT 0,
    is_visible BOOLEAN DEFAULT true
);

-- Products Table
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    name_en VARCHAR(255),
    name_he VARCHAR(255),
    name_ar VARCHAR(255),
    description TEXT,
    description_en TEXT,
    description_he TEXT,
    description_ar TEXT,
    price DECIMAL(10,2) NOT NULL,
    unit VARCHAR(50) DEFAULT 'piece',
    weight DECIMAL(10,3),
    image_url TEXT,
    is_available BOOLEAN DEFAULT true,
    availability_status VARCHAR(50) DEFAULT 'available',
    discount_percentage INTEGER DEFAULT 0,
    special_offer BOOLEAN DEFAULT false,
    category_id INTEGER REFERENCES categories(id)
);

-- Product Categories Junction Table
CREATE TABLE product_categories (
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
    PRIMARY KEY (product_id, category_id)
);

-- Users Table
CREATE TABLE users (
    id VARCHAR(255) PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    phone VARCHAR(50),
    role VARCHAR(50) DEFAULT 'customer',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    can_manage_products BOOLEAN DEFAULT false,
    can_manage_orders BOOLEAN DEFAULT false,
    can_manage_users BOOLEAN DEFAULT false,
    can_manage_settings BOOLEAN DEFAULT false,
    can_manage_themes BOOLEAN DEFAULT false
);

-- User Addresses Table
CREATE TABLE user_addresses (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
    address TEXT NOT NULL,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders Table
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'pending',
    total_amount DECIMAL(10,2) NOT NULL,
    delivery_address TEXT NOT NULL,
    delivery_date DATE NOT NULL,
    delivery_time VARCHAR(50),
    payment_method VARCHAR(50),
    phone VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    guest_first_name VARCHAR(255),
    guest_last_name VARCHAR(255),
    guest_email VARCHAR(255),
    cancellation_reason VARCHAR(255),
    discount_type VARCHAR(20),
    discount_value DECIMAL(10,2) DEFAULT 0,
    discount_reason TEXT,
    manual_total DECIMAL(10,2)
);

-- Order Items Table
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id),
    quantity INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    discount_type VARCHAR(20),
    discount_value DECIMAL(10,2) DEFAULT 0,
    discount_reason TEXT
);

-- Sessions Table
CREATE TABLE sessions (
    sid VARCHAR NOT NULL COLLATE "default",
    sess JSON NOT NULL,
    expire TIMESTAMP(6) NOT NULL,
    PRIMARY KEY (sid)
);

-- Push Subscriptions Table
CREATE TABLE push_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255),
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(endpoint)
);

-- Marketing Notifications Table
CREATE TABLE marketing_notifications (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    sent_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Themes Table
CREATE TABLE themes (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    name_en VARCHAR(255),
    name_he VARCHAR(255),
    name_ar VARCHAR(255),
    description TEXT,
    description_en TEXT,
    description_he TEXT,
    description_ar TEXT,
    logo_url TEXT,
    logo_url_en TEXT,
    logo_url_he TEXT,
    logo_url_ar TEXT,
    banner_image_url TEXT,
    banner_image_url_en TEXT,
    banner_image_url_he TEXT,
    banner_image_url_ar TEXT,
    primary_font VARCHAR(255) DEFAULT 'system-ui',
    secondary_font VARCHAR(255) DEFAULT 'system-ui',
    header_style VARCHAR(20) DEFAULT 'classic',
    primary_color VARCHAR(7) DEFAULT '#f97316',
    primary_text_color VARCHAR(7) DEFAULT '#ffffff',
    primary_dark_color VARCHAR(7) DEFAULT '#ea580c',
    primary_light_color VARCHAR(7) DEFAULT '#fed7aa',
    success_color VARCHAR(7) DEFAULT '#22c55e',
    warning_color VARCHAR(7) DEFAULT '#eab308',
    error_color VARCHAR(7) DEFAULT '#ef4444',
    info_color VARCHAR(7) DEFAULT '#3b82f6',
    tomorrow_color VARCHAR(7) DEFAULT '#06b6d4',
    tomorrow_dark_color VARCHAR(7) DEFAULT '#0891b2',
    out_of_stock_color VARCHAR(7) DEFAULT '#6b7280',
    working_hours_icon_color VARCHAR(7) DEFAULT '#f97316',
    contacts_icon_color VARCHAR(7) DEFAULT '#f97316',
    payment_delivery_icon_color VARCHAR(7) DEFAULT '#f97316',
    white_color VARCHAR(7) DEFAULT '#ffffff',
    gray100_color VARCHAR(7) DEFAULT '#f3f4f6',
    gray700_color VARCHAR(7) DEFAULT '#374151',
    gray900_color VARCHAR(7) DEFAULT '#111827',
    show_banner BOOLEAN DEFAULT true,
    show_title_description BOOLEAN DEFAULT true,
    show_category_menu BOOLEAN DEFAULT true,
    show_info_blocks BOOLEAN DEFAULT true,
    show_special_offers BOOLEAN DEFAULT true,
    show_whatsapp_chat BOOLEAN DEFAULT false,
    info_blocks_position VARCHAR(20) DEFAULT 'top',
    whatsapp_phone VARCHAR(50),
    whatsapp_message TEXT,
    cart_banner_type VARCHAR(10) DEFAULT 'text',
    cart_banner_text VARCHAR(255),
    cart_banner_image_url TEXT,
    cart_banner_color VARCHAR(7) DEFAULT '#f97316',
    bottom_banner1_text VARCHAR(255),
    bottom_banner1_link TEXT,
    bottom_banner1_image_url TEXT,
    bottom_banner2_text VARCHAR(255),
    bottom_banner2_link TEXT,
    bottom_banner2_image_url TEXT,
    banner_button_text VARCHAR(255),
    banner_button_link TEXT,
    modern_block1_icon VARCHAR(50),
    modern_block1_text VARCHAR(255),
    modern_block2_icon VARCHAR(50),
    modern_block2_text VARCHAR(255),
    modern_block3_icon VARCHAR(50),
    modern_block3_text VARCHAR(255),
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- EXPORT WILL BE COMPLETED IN NEXT STEP
-- ============================================
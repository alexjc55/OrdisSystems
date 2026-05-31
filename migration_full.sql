-- ============================================================
-- eDAHouse — Полная миграция БД
-- Безопасно запускать на любой существующей базе данных.
-- Все операции защищены IF NOT EXISTS / ADD COLUMN IF NOT EXISTS.
-- ============================================================

-- ============================================================
-- 1. НОВЫЕ ТАБЛИЦЫ
-- ============================================================

-- Адреса пользователей
CREATE TABLE IF NOT EXISTS user_addresses (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label VARCHAR(100) NOT NULL,
  address TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Ветки/филиалы
CREATE TABLE IF NOT EXISTS branches (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  name_en VARCHAR(255),
  name_he VARCHAR(255),
  name_ar VARCHAR(255),
  is_active BOOLEAN DEFAULT true NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Привязка пользователей к веткам
CREATE TABLE IF NOT EXISTS user_branches (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  branch_id INTEGER NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  UNIQUE(user_id, branch_id)
);

-- Доступность товаров по веткам
CREATE TABLE IF NOT EXISTS product_branch_availability (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  branch_id INTEGER NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  is_available BOOLEAN DEFAULT true NOT NULL,
  stock_status VARCHAR DEFAULT 'in_stock' NOT NULL,
  availability_status VARCHAR DEFAULT 'available' NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(product_id, branch_id)
);

-- Связь товаров с категориями (many-to-many)
CREATE TABLE IF NOT EXISTS product_categories (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(product_id, category_id)
);

-- Универсальная таблица переводов
CREATE TABLE IF NOT EXISTS translations (
  id SERIAL PRIMARY KEY,
  entity_type VARCHAR NOT NULL,
  entity_id VARCHAR NOT NULL,
  field VARCHAR NOT NULL,
  language VARCHAR(2) NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Подписки на push-уведомления
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- История маркетинговых уведомлений
CREATE TABLE IF NOT EXISTS marketing_notifications (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  title_en TEXT,
  message_en TEXT,
  title_he TEXT,
  message_he TEXT,
  title_ar TEXT,
  message_ar TEXT,
  sent_count INTEGER DEFAULT 0,
  created_by TEXT NOT NULL,
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Купоны / промокоды
CREATE TABLE IF NOT EXISTS coupons (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  discount_type VARCHAR NOT NULL,
  discount_value DECIMAL(10,2) NOT NULL,
  min_order_amount DECIMAL(10,2) DEFAULT 0,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0 NOT NULL,
  usage_type VARCHAR DEFAULT 'multi' NOT NULL,
  scope VARCHAR DEFAULT 'order' NOT NULL,
  target_customer_email VARCHAR(255),
  target_user_id VARCHAR(255) REFERENCES users(id),
  target_customer_emails JSONB,
  target_user_ids JSONB,
  applicable_product_ids JSONB,
  stacks_with_loyalty BOOLEAN DEFAULT false NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Использования купонов
CREATE TABLE IF NOT EXISTS coupon_uses (
  id SERIAL PRIMARY KEY,
  coupon_id INTEGER NOT NULL REFERENCES coupons(id),
  order_id INTEGER NOT NULL REFERENCES orders(id),
  user_id VARCHAR REFERENCES users(id),
  used_at TIMESTAMP DEFAULT NOW()
);

-- Объёмные скидки на товары
CREATE TABLE IF NOT EXISTS product_volume_discounts (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  min_quantity DECIMAL(10,3) NOT NULL,
  discount_type VARCHAR NOT NULL,
  discount_value DECIMAL(10,2) NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Ожидающие платежи (для онлайн-оплаты)
CREATE TABLE IF NOT EXISTS pending_payments (
  id SERIAL PRIMARY KEY,
  token VARCHAR(128) NOT NULL UNIQUE,
  order_data JSONB NOT NULL,
  order_items JSONB NOT NULL,
  user_id VARCHAR REFERENCES users(id),
  status VARCHAR DEFAULT 'pending' NOT NULL,
  transaction_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pending_payments_token
  ON pending_payments (token);

CREATE INDEX IF NOT EXISTS idx_pending_payments_expires_at
  ON pending_payments (expires_at);

-- Закрытые даты (праздники)
CREATE TABLE IF NOT EXISTS closed_dates (
  id SERIAL PRIMARY KEY,
  date VARCHAR(10) NOT NULL UNIQUE,
  reason TEXT NOT NULL,
  reason_en TEXT,
  reason_he TEXT,
  reason_ar TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);


-- ============================================================
-- 2. ИЗМЕНЕНИЯ СУЩЕСТВУЮЩИХ ТАБЛИЦ
-- ============================================================

-- -----------------------------------------------------------
-- users
-- -----------------------------------------------------------
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR,
  ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMP;

-- -----------------------------------------------------------
-- categories
-- -----------------------------------------------------------
ALTER TABLE branches
  ALTER COLUMN name DROP NOT NULL;

ALTER TABLE categories
  ALTER COLUMN name DROP NOT NULL;

ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS name_en VARCHAR(255),
  ADD COLUMN IF NOT EXISTS name_he VARCHAR(255),
  ADD COLUMN IF NOT EXISTS name_ar VARCHAR(255),
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS description_en TEXT,
  ADD COLUMN IF NOT EXISTS description_he TEXT,
  ADD COLUMN IF NOT EXISTS description_ar TEXT,
  ADD COLUMN IF NOT EXISTS image VARCHAR(500),
  ADD COLUMN IF NOT EXISTS external_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS external_source VARCHAR(50);

-- -----------------------------------------------------------
-- products
-- -----------------------------------------------------------
ALTER TABLE products
  ALTER COLUMN name DROP NOT NULL;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS name_en VARCHAR(255),
  ADD COLUMN IF NOT EXISTS name_he VARCHAR(255),
  ADD COLUMN IF NOT EXISTS name_ar VARCHAR(255),
  ADD COLUMN IF NOT EXISTS description_en TEXT,
  ADD COLUMN IF NOT EXISTS description_he TEXT,
  ADD COLUMN IF NOT EXISTS description_ar TEXT,
  ADD COLUMN IF NOT EXISTS ingredients TEXT,
  ADD COLUMN IF NOT EXISTS ingredients_en TEXT,
  ADD COLUMN IF NOT EXISTS ingredients_he TEXT,
  ADD COLUMN IF NOT EXISTS ingredients_ar TEXT,
  ADD COLUMN IF NOT EXISTS price DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS unit VARCHAR(20) DEFAULT '100g' NOT NULL,
  ADD COLUMN IF NOT EXISTS image_url_en VARCHAR(500),
  ADD COLUMN IF NOT EXISTS image_url_he VARCHAR(500),
  ADD COLUMN IF NOT EXISTS image_url_ar VARCHAR(500),
  ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT true NOT NULL,
  ADD COLUMN IF NOT EXISTS stock_status VARCHAR DEFAULT 'in_stock' NOT NULL,
  ADD COLUMN IF NOT EXISTS availability_status VARCHAR DEFAULT 'available' NOT NULL,
  ADD COLUMN IF NOT EXISTS is_special_offer BOOLEAN DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS discount_type VARCHAR,
  ADD COLUMN IF NOT EXISTS discount_value DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS barcode VARCHAR(50),
  ADD COLUMN IF NOT EXISTS external_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS external_source VARCHAR(50);

-- price: если колонки ещё нет — добавляем и копируем из price_per_kg
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='products' AND column_name='price'
  ) THEN
    ALTER TABLE products ADD COLUMN price DECIMAL(10,2);
    UPDATE products SET price = price_per_kg WHERE price IS NULL;
  END IF;
END $$;

-- -----------------------------------------------------------
-- orders
-- -----------------------------------------------------------
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS branch_id INTEGER REFERENCES branches(id),
  ADD COLUMN IF NOT EXISTS delivery_fee DECIMAL(10,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS guest_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS guest_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS guest_phone VARCHAR(20),
  ADD COLUMN IF NOT EXISTS guest_access_token VARCHAR(255) UNIQUE,
  ADD COLUMN IF NOT EXISTS guest_access_token_expires TIMESTAMP,
  ADD COLUMN IF NOT EXISTS guest_claim_token VARCHAR(255) UNIQUE,
  ADD COLUMN IF NOT EXISTS order_language VARCHAR(5) DEFAULT 'ru',
  ADD COLUMN IF NOT EXISTS delivery_date VARCHAR(20),
  ADD COLUMN IF NOT EXISTS delivery_time VARCHAR(50),
  ADD COLUMN IF NOT EXISTS requested_delivery_time TIMESTAMP,
  ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50),
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
  ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS coupon_discount DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS loyalty_discount DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS gift_product_id INTEGER,
  ADD COLUMN IF NOT EXISTS discount_details JSONB;

-- -----------------------------------------------------------
-- order_items
-- -----------------------------------------------------------
-- quantity может быть DECIMAL (вес в кг), если старая БД имеет INTEGER — меняем
ALTER TABLE order_items
  ALTER COLUMN quantity TYPE DECIMAL(10,3) USING quantity::decimal;

-- -----------------------------------------------------------
-- store_settings — основные новые колонки
-- -----------------------------------------------------------
ALTER TABLE store_settings
  -- Настройки доставки
  ADD COLUMN IF NOT EXISTS delivery_hours JSONB,
  ADD COLUMN IF NOT EXISTS min_delivery_time_hours INTEGER DEFAULT 2,
  ADD COLUMN IF NOT EXISTS max_delivery_time_days INTEGER DEFAULT 4,
  ADD COLUMN IF NOT EXISTS delivery_time_mode VARCHAR DEFAULT 'hours',
  -- Фото "О нас"
  ADD COLUMN IF NOT EXISTS about_us_photos JSONB,
  -- Пагинация
  ADD COLUMN IF NOT EXISTS default_items_per_page INTEGER DEFAULT 10,
  -- Кастомный HTML
  ADD COLUMN IF NOT EXISTS header_html TEXT,
  ADD COLUMN IF NOT EXISTS footer_html TEXT,
  -- Причины отмены
  ADD COLUMN IF NOT EXISTS cancellation_reasons JSONB,
  -- WhatsApp
  ADD COLUMN IF NOT EXISTS show_whatsapp_chat BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_phone_number VARCHAR(20),
  ADD COLUMN IF NOT EXISTS whatsapp_default_message TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_default_message_ar TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_default_message_he TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_default_message_en TEXT,
  -- Баннер корзины
  ADD COLUMN IF NOT EXISTS show_cart_banner BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS cart_banner_type VARCHAR DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS cart_banner_image VARCHAR(500),
  ADD COLUMN IF NOT EXISTS cart_banner_image_en VARCHAR(500),
  ADD COLUMN IF NOT EXISTS cart_banner_image_he VARCHAR(500),
  ADD COLUMN IF NOT EXISTS cart_banner_image_ar VARCHAR(500),
  ADD COLUMN IF NOT EXISTS cart_banner_text TEXT,
  ADD COLUMN IF NOT EXISTS cart_banner_text_ar TEXT,
  ADD COLUMN IF NOT EXISTS cart_banner_text_he TEXT,
  ADD COLUMN IF NOT EXISTS cart_banner_text_en TEXT,
  ADD COLUMN IF NOT EXISTS cart_banner_bg_color VARCHAR(7) DEFAULT '#f97316',
  ADD COLUMN IF NOT EXISTS cart_banner_text_color VARCHAR(7) DEFAULT '#ffffff',
  -- Стиль шапки и логотипа
  ADD COLUMN IF NOT EXISTS header_style VARCHAR DEFAULT 'classic',
  ADD COLUMN IF NOT EXISTS logo_text_mode VARCHAR(20) DEFAULT 'storeName',
  ADD COLUMN IF NOT EXISTS category_display_style VARCHAR(20) DEFAULT 'default',
  ADD COLUMN IF NOT EXISTS product_image_aspect VARCHAR(20) DEFAULT 'horizontal',
  ADD COLUMN IF NOT EXISTS product_image_click_modal BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS preorder_button_style VARCHAR(20) DEFAULT 'tomorrow',
  -- Баннер кнопка
  ADD COLUMN IF NOT EXISTS banner_button_text VARCHAR(100) DEFAULT 'Смотреть каталог',
  ADD COLUMN IF NOT EXISTS banner_button_link VARCHAR(500) DEFAULT '#categories',
  ADD COLUMN IF NOT EXISTS banner_image_url VARCHAR(500),
  -- Нижние баннеры
  ADD COLUMN IF NOT EXISTS show_bottom_banners BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS bottom_banner1_url VARCHAR(500),
  ADD COLUMN IF NOT EXISTS bottom_banner1_url_en VARCHAR(500),
  ADD COLUMN IF NOT EXISTS bottom_banner1_url_he VARCHAR(500),
  ADD COLUMN IF NOT EXISTS bottom_banner1_url_ar VARCHAR(500),
  ADD COLUMN IF NOT EXISTS bottom_banner1_link VARCHAR(500),
  ADD COLUMN IF NOT EXISTS bottom_banner2_url VARCHAR(500),
  ADD COLUMN IF NOT EXISTS bottom_banner2_url_en VARCHAR(500),
  ADD COLUMN IF NOT EXISTS bottom_banner2_url_he VARCHAR(500),
  ADD COLUMN IF NOT EXISTS bottom_banner2_url_ar VARCHAR(500),
  ADD COLUMN IF NOT EXISTS bottom_banner2_link VARCHAR(500),
  -- Права сотрудника
  ADD COLUMN IF NOT EXISTS worker_permissions JSONB DEFAULT '{"canManageProducts":true,"canManageCategories":true,"canManageOrders":true,"canViewUsers":false,"canManageUsers":false,"canViewSettings":false,"canManageSettings":false,"canManageThemes":false,"canCreateOrders":true,"canManageTranslations":false}',
  -- Настройки языков
  ADD COLUMN IF NOT EXISTS default_language VARCHAR(5) DEFAULT 'ru',
  ADD COLUMN IF NOT EXISTS enabled_languages JSONB DEFAULT '["ru","en","he","ar"]',
  ADD COLUMN IF NOT EXISTS language_order JSONB DEFAULT '["ru","en","he","ar"]',
  -- Функции
  ADD COLUMN IF NOT EXISTS enable_admin_order_creation BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS checkout_guest_first BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS week_start_day VARCHAR(10) DEFAULT 'monday',
  -- Видимость блоков
  ADD COLUMN IF NOT EXISTS show_banner_image BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_title_description BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_info_blocks BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS info_blocks_position VARCHAR DEFAULT 'top',
  ADD COLUMN IF NOT EXISTS show_special_offers BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_category_menu BOOLEAN DEFAULT true,
  -- Мобильное меню
  ADD COLUMN IF NOT EXISTS mobile_quick_buttons JSONB DEFAULT '[]',
  -- Штрихкод
  ADD COLUMN IF NOT EXISTS barcode_system_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS barcode_product_code_start INTEGER DEFAULT 2,
  ADD COLUMN IF NOT EXISTS barcode_product_code_end INTEGER DEFAULT 5,
  ADD COLUMN IF NOT EXISTS barcode_weight_start INTEGER DEFAULT 6,
  ADD COLUMN IF NOT EXISTS barcode_weight_end INTEGER DEFAULT 10,
  ADD COLUMN IF NOT EXISTS barcode_weight_unit VARCHAR DEFAULT 'grams',
  -- Слайдер
  ADD COLUMN IF NOT EXISTS slider_autoplay BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS slider_speed INTEGER DEFAULT 5000,
  ADD COLUMN IF NOT EXISTS slider_effect VARCHAR(10) DEFAULT 'fade',
  -- Слайды 1-5 (основные поля)
  ADD COLUMN IF NOT EXISTS slide1_image VARCHAR(500),
  ADD COLUMN IF NOT EXISTS slide1_title VARCHAR(255),
  ADD COLUMN IF NOT EXISTS slide1_subtitle TEXT,
  ADD COLUMN IF NOT EXISTS slide1_button_text VARCHAR(100),
  ADD COLUMN IF NOT EXISTS slide1_button_link VARCHAR(500),
  ADD COLUMN IF NOT EXISTS slide1_text_position VARCHAR(20) DEFAULT 'left-center',
  ADD COLUMN IF NOT EXISTS slide2_image VARCHAR(500),
  ADD COLUMN IF NOT EXISTS slide2_title VARCHAR(255),
  ADD COLUMN IF NOT EXISTS slide2_subtitle TEXT,
  ADD COLUMN IF NOT EXISTS slide2_button_text VARCHAR(100),
  ADD COLUMN IF NOT EXISTS slide2_button_link VARCHAR(500),
  ADD COLUMN IF NOT EXISTS slide2_text_position VARCHAR(20) DEFAULT 'left-center',
  ADD COLUMN IF NOT EXISTS slide3_image VARCHAR(500),
  ADD COLUMN IF NOT EXISTS slide3_title VARCHAR(255),
  ADD COLUMN IF NOT EXISTS slide3_subtitle TEXT,
  ADD COLUMN IF NOT EXISTS slide3_button_text VARCHAR(100),
  ADD COLUMN IF NOT EXISTS slide3_button_link VARCHAR(500),
  ADD COLUMN IF NOT EXISTS slide3_text_position VARCHAR(20) DEFAULT 'left-center',
  ADD COLUMN IF NOT EXISTS slide4_image VARCHAR(500),
  ADD COLUMN IF NOT EXISTS slide4_title VARCHAR(255),
  ADD COLUMN IF NOT EXISTS slide4_subtitle TEXT,
  ADD COLUMN IF NOT EXISTS slide4_button_text VARCHAR(100),
  ADD COLUMN IF NOT EXISTS slide4_button_link VARCHAR(500),
  ADD COLUMN IF NOT EXISTS slide4_text_position VARCHAR(20) DEFAULT 'left-center',
  ADD COLUMN IF NOT EXISTS slide5_image VARCHAR(500),
  ADD COLUMN IF NOT EXISTS slide5_title VARCHAR(255),
  ADD COLUMN IF NOT EXISTS slide5_subtitle TEXT,
  ADD COLUMN IF NOT EXISTS slide5_button_text VARCHAR(100),
  ADD COLUMN IF NOT EXISTS slide5_button_link VARCHAR(500),
  ADD COLUMN IF NOT EXISTS slide5_text_position VARCHAR(20) DEFAULT 'left-center',
  -- Слайды - изображения по языкам
  ADD COLUMN IF NOT EXISTS slide1_image_en VARCHAR(500),
  ADD COLUMN IF NOT EXISTS slide1_image_he VARCHAR(500),
  ADD COLUMN IF NOT EXISTS slide1_image_ar VARCHAR(500),
  ADD COLUMN IF NOT EXISTS slide2_image_en VARCHAR(500),
  ADD COLUMN IF NOT EXISTS slide2_image_he VARCHAR(500),
  ADD COLUMN IF NOT EXISTS slide2_image_ar VARCHAR(500),
  ADD COLUMN IF NOT EXISTS slide3_image_en VARCHAR(500),
  ADD COLUMN IF NOT EXISTS slide3_image_he VARCHAR(500),
  ADD COLUMN IF NOT EXISTS slide3_image_ar VARCHAR(500),
  ADD COLUMN IF NOT EXISTS slide4_image_en VARCHAR(500),
  ADD COLUMN IF NOT EXISTS slide4_image_he VARCHAR(500),
  ADD COLUMN IF NOT EXISTS slide4_image_ar VARCHAR(500),
  ADD COLUMN IF NOT EXISTS slide5_image_en VARCHAR(500),
  ADD COLUMN IF NOT EXISTS slide5_image_he VARCHAR(500),
  ADD COLUMN IF NOT EXISTS slide5_image_ar VARCHAR(500),
  -- Арабский язык
  ADD COLUMN IF NOT EXISTS store_name_ar VARCHAR(255),
  ADD COLUMN IF NOT EXISTS welcome_title_ar VARCHAR(255),
  ADD COLUMN IF NOT EXISTS store_description_ar TEXT,
  ADD COLUMN IF NOT EXISTS delivery_info_ar TEXT,
  ADD COLUMN IF NOT EXISTS about_text_ar TEXT,
  ADD COLUMN IF NOT EXISTS banner_button_text_ar VARCHAR(100),
  ADD COLUMN IF NOT EXISTS discount_badge_text_ar VARCHAR(50),
  ADD COLUMN IF NOT EXISTS cart_banner_text_ar TEXT,
  ADD COLUMN IF NOT EXISTS payment_info_ar TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone_ar VARCHAR(50),
  ADD COLUMN IF NOT EXISTS contact_email_ar VARCHAR(255),
  ADD COLUMN IF NOT EXISTS address_ar TEXT,
  ADD COLUMN IF NOT EXISTS slide1_title_ar VARCHAR(255),
  ADD COLUMN IF NOT EXISTS slide1_subtitle_ar TEXT,
  ADD COLUMN IF NOT EXISTS slide1_button_text_ar VARCHAR(100),
  ADD COLUMN IF NOT EXISTS slide2_title_ar VARCHAR(255),
  ADD COLUMN IF NOT EXISTS slide2_subtitle_ar TEXT,
  ADD COLUMN IF NOT EXISTS slide2_button_text_ar VARCHAR(100),
  ADD COLUMN IF NOT EXISTS slide3_title_ar VARCHAR(255),
  ADD COLUMN IF NOT EXISTS slide3_subtitle_ar TEXT,
  ADD COLUMN IF NOT EXISTS slide3_button_text_ar VARCHAR(100),
  ADD COLUMN IF NOT EXISTS slide4_title_ar VARCHAR(255),
  ADD COLUMN IF NOT EXISTS slide4_subtitle_ar TEXT,
  ADD COLUMN IF NOT EXISTS slide4_button_text_ar VARCHAR(100),
  ADD COLUMN IF NOT EXISTS slide5_title_ar VARCHAR(255),
  ADD COLUMN IF NOT EXISTS slide5_subtitle_ar TEXT,
  ADD COLUMN IF NOT EXISTS slide5_button_text_ar VARCHAR(100),
  -- Иврит
  ADD COLUMN IF NOT EXISTS store_name_he VARCHAR(255),
  ADD COLUMN IF NOT EXISTS welcome_title_he VARCHAR(255),
  ADD COLUMN IF NOT EXISTS store_description_he TEXT,
  ADD COLUMN IF NOT EXISTS delivery_info_he TEXT,
  ADD COLUMN IF NOT EXISTS about_text_he TEXT,
  ADD COLUMN IF NOT EXISTS banner_button_text_he VARCHAR(100),
  ADD COLUMN IF NOT EXISTS discount_badge_text_he VARCHAR(50),
  ADD COLUMN IF NOT EXISTS cart_banner_text_he TEXT,
  ADD COLUMN IF NOT EXISTS payment_info_he TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone_he VARCHAR(50),
  ADD COLUMN IF NOT EXISTS contact_email_he VARCHAR(255),
  ADD COLUMN IF NOT EXISTS address_he TEXT,
  ADD COLUMN IF NOT EXISTS slide1_title_he VARCHAR(255),
  ADD COLUMN IF NOT EXISTS slide1_subtitle_he TEXT,
  ADD COLUMN IF NOT EXISTS slide1_button_text_he VARCHAR(100),
  ADD COLUMN IF NOT EXISTS slide2_title_he VARCHAR(255),
  ADD COLUMN IF NOT EXISTS slide2_subtitle_he TEXT,
  ADD COLUMN IF NOT EXISTS slide2_button_text_he VARCHAR(100),
  ADD COLUMN IF NOT EXISTS slide3_title_he VARCHAR(255),
  ADD COLUMN IF NOT EXISTS slide3_subtitle_he TEXT,
  ADD COLUMN IF NOT EXISTS slide3_button_text_he VARCHAR(100),
  ADD COLUMN IF NOT EXISTS slide4_title_he VARCHAR(255),
  ADD COLUMN IF NOT EXISTS slide4_subtitle_he TEXT,
  ADD COLUMN IF NOT EXISTS slide4_button_text_he VARCHAR(100),
  ADD COLUMN IF NOT EXISTS slide5_title_he VARCHAR(255),
  ADD COLUMN IF NOT EXISTS slide5_subtitle_he TEXT,
  ADD COLUMN IF NOT EXISTS slide5_button_text_he VARCHAR(100),
  -- Английский
  ADD COLUMN IF NOT EXISTS store_name_en VARCHAR(255),
  ADD COLUMN IF NOT EXISTS welcome_title_en VARCHAR(255),
  ADD COLUMN IF NOT EXISTS store_description_en TEXT,
  ADD COLUMN IF NOT EXISTS delivery_info_en TEXT,
  ADD COLUMN IF NOT EXISTS about_text_en TEXT,
  ADD COLUMN IF NOT EXISTS banner_button_text_en VARCHAR(100),
  ADD COLUMN IF NOT EXISTS discount_badge_text_en VARCHAR(50),
  ADD COLUMN IF NOT EXISTS cart_banner_text_en TEXT,
  ADD COLUMN IF NOT EXISTS payment_info_en TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone_en VARCHAR(50),
  ADD COLUMN IF NOT EXISTS contact_email_en VARCHAR(255),
  ADD COLUMN IF NOT EXISTS address_en TEXT,
  ADD COLUMN IF NOT EXISTS slide1_title_en VARCHAR(255),
  ADD COLUMN IF NOT EXISTS slide1_subtitle_en TEXT,
  ADD COLUMN IF NOT EXISTS slide1_button_text_en VARCHAR(100),
  ADD COLUMN IF NOT EXISTS slide2_title_en VARCHAR(255),
  ADD COLUMN IF NOT EXISTS slide2_subtitle_en TEXT,
  ADD COLUMN IF NOT EXISTS slide2_button_text_en VARCHAR(100),
  ADD COLUMN IF NOT EXISTS slide3_title_en VARCHAR(255),
  ADD COLUMN IF NOT EXISTS slide3_subtitle_en TEXT,
  ADD COLUMN IF NOT EXISTS slide3_button_text_en VARCHAR(100),
  ADD COLUMN IF NOT EXISTS slide4_title_en VARCHAR(255),
  ADD COLUMN IF NOT EXISTS slide4_subtitle_en TEXT,
  ADD COLUMN IF NOT EXISTS slide4_button_text_en VARCHAR(100),
  ADD COLUMN IF NOT EXISTS slide5_title_en VARCHAR(255),
  ADD COLUMN IF NOT EXISTS slide5_subtitle_en TEXT,
  ADD COLUMN IF NOT EXISTS slide5_button_text_en VARCHAR(100),
  -- Русский базовый
  ADD COLUMN IF NOT EXISTS about_text_ru TEXT,
  ADD COLUMN IF NOT EXISTS banner_button_text_ru VARCHAR(100),
  -- Modern-блоки
  ADD COLUMN IF NOT EXISTS modern_block1_icon VARCHAR(50),
  ADD COLUMN IF NOT EXISTS modern_block1_text VARCHAR(255),
  ADD COLUMN IF NOT EXISTS modern_block2_icon VARCHAR(50),
  ADD COLUMN IF NOT EXISTS modern_block2_text VARCHAR(255),
  ADD COLUMN IF NOT EXISTS modern_block3_icon VARCHAR(50),
  ADD COLUMN IF NOT EXISTS modern_block3_text VARCHAR(255),
  ADD COLUMN IF NOT EXISTS modern_block1_text_en VARCHAR(255),
  ADD COLUMN IF NOT EXISTS modern_block2_text_en VARCHAR(255),
  ADD COLUMN IF NOT EXISTS modern_block3_text_en VARCHAR(255),
  ADD COLUMN IF NOT EXISTS modern_block1_text_he VARCHAR(255),
  ADD COLUMN IF NOT EXISTS modern_block2_text_he VARCHAR(255),
  ADD COLUMN IF NOT EXISTS modern_block3_text_he VARCHAR(255),
  ADD COLUMN IF NOT EXISTS modern_block1_text_ar VARCHAR(255),
  ADD COLUMN IF NOT EXISTS modern_block2_text_ar VARCHAR(255),
  ADD COLUMN IF NOT EXISTS modern_block3_text_ar VARCHAR(255),
  -- PWA
  ADD COLUMN IF NOT EXISTS pwa_icon VARCHAR(500),
  ADD COLUMN IF NOT EXISTS pwa_name VARCHAR(100) DEFAULT 'eDAHouse',
  ADD COLUMN IF NOT EXISTS pwa_description TEXT DEFAULT 'Готовые блюда с доставкой',
  ADD COLUMN IF NOT EXISTS pwa_name_en VARCHAR(100),
  ADD COLUMN IF NOT EXISTS pwa_description_en TEXT,
  ADD COLUMN IF NOT EXISTS pwa_name_he VARCHAR(100),
  ADD COLUMN IF NOT EXISTS pwa_description_he TEXT,
  ADD COLUMN IF NOT EXISTS pwa_name_ar VARCHAR(100),
  ADD COLUMN IF NOT EXISTS pwa_description_ar TEXT,
  -- Email уведомления
  ADD COLUMN IF NOT EXISTS email_notifications_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS order_notification_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS order_notification_from_name VARCHAR(255) DEFAULT 'eDAHouse Store',
  ADD COLUMN IF NOT EXISTS order_notification_from_email VARCHAR(255) DEFAULT 'noreply@edahouse.com',
  ADD COLUMN IF NOT EXISTS smtp_host VARCHAR(255),
  ADD COLUMN IF NOT EXISTS smtp_port INTEGER DEFAULT 587,
  ADD COLUMN IF NOT EXISTS smtp_secure BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS smtp_user VARCHAR(255),
  ADD COLUMN IF NOT EXISTS smtp_password VARCHAR(255),
  ADD COLUMN IF NOT EXISTS sendgrid_api_key VARCHAR(255),
  ADD COLUMN IF NOT EXISTS use_sendgrid BOOLEAN DEFAULT false,
  -- Facebook
  ADD COLUMN IF NOT EXISTS facebook_pixel_id VARCHAR(50),
  ADD COLUMN IF NOT EXISTS facebook_conversions_api_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS facebook_access_token VARCHAR(500),
  -- Программа лояльности
  ADD COLUMN IF NOT EXISTS loyalty_discount_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS loyalty_discount_percent DECIMAL(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gift_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS gift_product_id INTEGER,
  ADD COLUMN IF NOT EXISTS gift_product_quantity DECIMAL(10,2) DEFAULT 1,
  ADD COLUMN IF NOT EXISTS gift_min_order_amount DECIMAL(10,2) DEFAULT 300,
  -- Онлайн-оплата
  ADD COLUMN IF NOT EXISTS payment_provider_config JSONB,
  -- Скидочный бейдж
  ADD COLUMN IF NOT EXISTS discount_badge_text VARCHAR(50) DEFAULT 'Скидка',
  -- Токен безопасности фидов
  ADD COLUMN IF NOT EXISTS feed_token VARCHAR(36);


-- ============================================================
-- 3. ОБНОВЛЕНИЕ ДАННЫХ В СУЩЕСТВУЮЩИХ СТРОКАХ
-- ============================================================

-- Добавить canManageTranslations в существующие строки worker_permissions
UPDATE store_settings
SET worker_permissions = worker_permissions || '{"canManageTranslations": false}'::jsonb
WHERE worker_permissions IS NOT NULL
  AND NOT (worker_permissions ? 'canManageTranslations');

-- Установить worker_permissions по умолчанию если NULL
UPDATE store_settings
SET worker_permissions = '{"canManageProducts":true,"canManageCategories":true,"canManageOrders":true,"canViewUsers":false,"canManageUsers":false,"canViewSettings":false,"canManageSettings":false,"canManageThemes":false,"canCreateOrders":true,"canManageTranslations":false}'::jsonb
WHERE worker_permissions IS NULL;

-- Установить enabled_languages если NULL
UPDATE store_settings
SET enabled_languages = '["ru","en","he","ar"]'::jsonb
WHERE enabled_languages IS NULL;

-- Инициализировать language_order из enabled_languages если уже заполнен
UPDATE store_settings
SET language_order = enabled_languages
WHERE (language_order IS NULL OR language_order = '[]'::jsonb)
  AND enabled_languages IS NOT NULL
  AND enabled_languages != '[]'::jsonb;

-- Финальный фолбэк если enabled_languages тоже пустой
UPDATE store_settings
SET language_order = '["ru","en","he","ar"]'::jsonb
WHERE language_order IS NULL OR language_order = '[]'::jsonb;

-- Установить default_language если NULL
UPDATE store_settings
SET default_language = 'ru'
WHERE default_language IS NULL;

-- Заполнить price из price_per_kg если пусто
UPDATE products
SET price = price_per_kg
WHERE price IS NULL AND price_per_kg IS NOT NULL;

-- Установить unit по умолчанию если пусто
UPDATE products SET unit = '100g' WHERE unit IS NULL OR unit = '';


-- ============================================================
-- 4. THEMES — новые колонки
-- ============================================================

ALTER TABLE themes
  ALTER COLUMN name DROP NOT NULL;

ALTER TABLE themes
  ADD COLUMN IF NOT EXISTS name_en VARCHAR(100),
  ADD COLUMN IF NOT EXISTS name_he VARCHAR(100),
  ADD COLUMN IF NOT EXISTS name_ar VARCHAR(100),
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS description_en TEXT,
  ADD COLUMN IF NOT EXISTS description_he TEXT,
  ADD COLUMN IF NOT EXISTS description_ar TEXT,
  ADD COLUMN IF NOT EXISTS working_hours_icon_color VARCHAR(20) DEFAULT 'hsl(220, 91%, 54%)',
  ADD COLUMN IF NOT EXISTS contacts_icon_color VARCHAR(20) DEFAULT 'hsl(142, 76%, 36%)',
  ADD COLUMN IF NOT EXISTS payment_delivery_icon_color VARCHAR(20) DEFAULT 'hsl(262, 83%, 58%)',
  ADD COLUMN IF NOT EXISTS header_style VARCHAR(20) DEFAULT 'classic',
  ADD COLUMN IF NOT EXISTS category_display_style VARCHAR(20) DEFAULT 'default',
  ADD COLUMN IF NOT EXISTS product_image_aspect VARCHAR(20) DEFAULT 'horizontal',
  ADD COLUMN IF NOT EXISTS product_image_click_modal BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS banner_button_text VARCHAR(100) DEFAULT 'Смотреть каталог',
  ADD COLUMN IF NOT EXISTS banner_button_text_en VARCHAR(100),
  ADD COLUMN IF NOT EXISTS banner_button_text_he VARCHAR(100),
  ADD COLUMN IF NOT EXISTS banner_button_text_ar VARCHAR(100),
  ADD COLUMN IF NOT EXISTS banner_button_link VARCHAR(200) DEFAULT '#categories',
  ADD COLUMN IF NOT EXISTS logo_text_mode VARCHAR(20) DEFAULT 'storeName',
  ADD COLUMN IF NOT EXISTS logo_url VARCHAR(500) DEFAULT '',
  ADD COLUMN IF NOT EXISTS logo_url_en VARCHAR(500) DEFAULT '',
  ADD COLUMN IF NOT EXISTS logo_url_he VARCHAR(500) DEFAULT '',
  ADD COLUMN IF NOT EXISTS logo_url_ar VARCHAR(500) DEFAULT '',
  ADD COLUMN IF NOT EXISTS banner_image_url VARCHAR(500) DEFAULT '',
  ADD COLUMN IF NOT EXISTS banner_image_url_en VARCHAR(500) DEFAULT '',
  ADD COLUMN IF NOT EXISTS banner_image_url_he VARCHAR(500) DEFAULT '',
  ADD COLUMN IF NOT EXISTS banner_image_url_ar VARCHAR(500) DEFAULT '',
  ADD COLUMN IF NOT EXISTS show_cart_banner BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS cart_banner_type VARCHAR(10) DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS cart_banner_image VARCHAR(500) DEFAULT '',
  ADD COLUMN IF NOT EXISTS cart_banner_image_en VARCHAR(500) DEFAULT '',
  ADD COLUMN IF NOT EXISTS cart_banner_image_he VARCHAR(500) DEFAULT '',
  ADD COLUMN IF NOT EXISTS cart_banner_image_ar VARCHAR(500) DEFAULT '',
  ADD COLUMN IF NOT EXISTS cart_banner_text TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS cart_banner_text_en TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS cart_banner_text_he TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS cart_banner_text_ar TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS cart_banner_bg_color VARCHAR(7) DEFAULT '#f97316',
  ADD COLUMN IF NOT EXISTS cart_banner_text_color VARCHAR(7) DEFAULT '#ffffff',
  ADD COLUMN IF NOT EXISTS show_bottom_banners BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS bottom_banner1_url VARCHAR(500) DEFAULT '',
  ADD COLUMN IF NOT EXISTS bottom_banner1_url_en VARCHAR(500) DEFAULT '',
  ADD COLUMN IF NOT EXISTS bottom_banner1_url_he VARCHAR(500) DEFAULT '',
  ADD COLUMN IF NOT EXISTS bottom_banner1_url_ar VARCHAR(500) DEFAULT '',
  ADD COLUMN IF NOT EXISTS bottom_banner1_link VARCHAR(500) DEFAULT '',
  ADD COLUMN IF NOT EXISTS bottom_banner2_url VARCHAR(500) DEFAULT '',
  ADD COLUMN IF NOT EXISTS bottom_banner2_url_en VARCHAR(500) DEFAULT '',
  ADD COLUMN IF NOT EXISTS bottom_banner2_url_he VARCHAR(500) DEFAULT '',
  ADD COLUMN IF NOT EXISTS bottom_banner2_url_ar VARCHAR(500) DEFAULT '',
  ADD COLUMN IF NOT EXISTS bottom_banner2_link VARCHAR(500) DEFAULT '',
  ADD COLUMN IF NOT EXISTS modern_block1_icon VARCHAR(50) DEFAULT '',
  ADD COLUMN IF NOT EXISTS modern_block1_text VARCHAR(200) DEFAULT '',
  ADD COLUMN IF NOT EXISTS modern_block2_icon VARCHAR(50) DEFAULT '',
  ADD COLUMN IF NOT EXISTS modern_block2_text VARCHAR(200) DEFAULT '',
  ADD COLUMN IF NOT EXISTS modern_block3_icon VARCHAR(50) DEFAULT '',
  ADD COLUMN IF NOT EXISTS modern_block3_text VARCHAR(200) DEFAULT '',
  ADD COLUMN IF NOT EXISTS show_banner_image BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_title_description BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_info_blocks BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS info_blocks_position VARCHAR(10) DEFAULT 'top',
  ADD COLUMN IF NOT EXISTS show_special_offers BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_category_menu BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_whats_app_chat BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS whatsapp_phone VARCHAR(20) DEFAULT '',
  ADD COLUMN IF NOT EXISTS whatsapp_message TEXT DEFAULT 'Здравствуйте! У меня есть вопрос по заказу.',
  ADD COLUMN IF NOT EXISTS whatsapp_message_en TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS whatsapp_message_he TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS whatsapp_message_ar TEXT DEFAULT '',
  -- Слайды в темах
  ADD COLUMN IF NOT EXISTS slide1_image_en VARCHAR(500),
  ADD COLUMN IF NOT EXISTS slide1_image_he VARCHAR(500),
  ADD COLUMN IF NOT EXISTS slide1_image_ar VARCHAR(500),
  ADD COLUMN IF NOT EXISTS slide2_image_en VARCHAR(500),
  ADD COLUMN IF NOT EXISTS slide2_image_he VARCHAR(500),
  ADD COLUMN IF NOT EXISTS slide2_image_ar VARCHAR(500),
  ADD COLUMN IF NOT EXISTS slide3_image_en VARCHAR(500),
  ADD COLUMN IF NOT EXISTS slide3_image_he VARCHAR(500),
  ADD COLUMN IF NOT EXISTS slide3_image_ar VARCHAR(500),
  ADD COLUMN IF NOT EXISTS slide4_image_en VARCHAR(500),
  ADD COLUMN IF NOT EXISTS slide4_image_he VARCHAR(500),
  ADD COLUMN IF NOT EXISTS slide4_image_ar VARCHAR(500),
  ADD COLUMN IF NOT EXISTS slide5_image_en VARCHAR(500),
  ADD COLUMN IF NOT EXISTS slide5_image_he VARCHAR(500),
  ADD COLUMN IF NOT EXISTS slide5_image_ar VARCHAR(500);


-- Guest promo block columns
ALTER TABLE store_settings
  ADD COLUMN IF NOT EXISTS guest_promo_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS guest_promo_text TEXT,
  ADD COLUMN IF NOT EXISTS guest_promo_text_en TEXT,
  ADD COLUMN IF NOT EXISTS guest_promo_text_he TEXT,
  ADD COLUMN IF NOT EXISTS guest_promo_text_ar TEXT;

-- J5 payment capture: store transaction ID on orders for deferred capture/void
ALTER TABLE orders ADD COLUMN IF NOT EXISTS transaction_id VARCHAR(255);

-- ============================================================
-- ГОТОВО
-- ============================================================
-- Запустить командой:
--   psql $DATABASE_URL -f migration_full.sql
-- ============================================================

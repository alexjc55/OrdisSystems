-- =============================================================================
-- eDAHouse — Начальные данные для чистого развёртывания
-- Создаёт: admin-пользователя + базовые настройки магазина
--
-- Использование:
--   psql $DATABASE_URL -f seed_initial.sql
--
-- После запуска:
--   Логин: admin  /  Пароль: admin123
--   ⚠️  Сразу смените пароль в профиле администратора!
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Admin-пользователь
--    Пароль: admin123 (bcrypt, 12 rounds)
-- -----------------------------------------------------------------------------
INSERT INTO users (
    id,
    username,
    email,
    first_name,
    last_name,
    role,
    password,
    created_at,
    updated_at
)
VALUES (
    'admin-default',
    'admin',
    'admin@example.com',
    'Admin',
    '',
    'admin',
    '$2b$12$stD79cugS6f/W7JoAbDuWOSqf1VO8aQLXRc4OYxjF1t8.q39GmB3.',
    NOW(),
    NOW()
)
ON CONFLICT (username) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 2. Базовые настройки магазина
--    Заполните store_name, contact_phone, contact_email, address
--    после входа в панель администратора (раздел "Настройки")
-- -----------------------------------------------------------------------------
INSERT INTO store_settings (
    store_name,
    welcome_title,
    store_description,
    contact_phone,
    contact_email,
    address,
    working_hours,
    delivery_hours,
    delivery_fee,
    free_delivery_from,
    min_delivery_time_hours,
    max_delivery_time_days,
    delivery_time_mode,
    is_delivery_enabled,
    is_pickup_enabled,
    payment_methods,
    cancellation_reasons,
    discount_badge_text,
    show_banner_image,
    show_title_description,
    show_info_blocks,
    show_special_offers,
    show_category_menu,
    show_bottom_banners,
    show_cart_banner,
    cart_banner_type,
    cart_banner_bg_color,
    cart_banner_text_color,
    show_whatsapp_chat,
    week_start_day,
    default_items_per_page,
    default_language,
    enabled_languages,
    info_blocks_position,
    header_style,
    banner_button_text,
    banner_button_link,
    auth_page_title,
    auth_page_subtitle,
    auth_page_feature1,
    auth_page_feature2,
    auth_page_feature3,
    worker_permissions,
    barcode_system_enabled,
    barcode_product_code_start,
    barcode_product_code_end,
    barcode_weight_start,
    barcode_weight_end,
    barcode_weight_unit,
    enable_admin_order_creation,
    slider_autoplay,
    slider_speed,
    slider_effect,
    email_notifications_enabled,
    use_sendgrid,
    facebook_conversions_api_enabled,
    updated_at
)
VALUES (
    'Мой магазин',                          -- store_name
    'Добро пожаловать!',                     -- welcome_title
    'Готовые блюда с доставкой на дом',      -- store_description
    '',                                       -- contact_phone
    '',                                       -- contact_email
    '',                                       -- address
    -- working_hours: пн-пт 09:00-21:00, сб-вс 10:00-20:00
    '{"monday":"09:00-21:00","tuesday":"09:00-21:00","wednesday":"09:00-21:00","thursday":"09:00-21:00","friday":"09:00-21:00","saturday":"10:00-20:00","sunday":"10:00-20:00"}',
    -- delivery_hours: null = совпадает с рабочими часами
    '{"monday":null,"tuesday":null,"wednesday":null,"thursday":null,"friday":null,"saturday":null,"sunday":null}',
    15.00,                                    -- delivery_fee
    100.00,                                   -- free_delivery_from
    2,                                        -- min_delivery_time_hours
    4,                                        -- max_delivery_time_days
    'hours',                                  -- delivery_time_mode
    true,                                     -- is_delivery_enabled
    true,                                     -- is_pickup_enabled
    -- payment_methods
    '[{"name":"Наличными","name_en":"Cash","name_he":"מזומן","name_ar":"نقدًا","fee":0,"enabled":true},{"name":"Банковская карта","name_en":"Credit Card","name_he":"כרטיס אשראי","name_ar":"بطاقة ائتمان","fee":0,"enabled":true}]',
    -- cancellation_reasons
    '["Передумал","Долгое ожидание","Ошибка в заказе","Другая причина"]',
    'Скидка',                                 -- discount_badge_text
    true,                                     -- show_banner_image
    true,                                     -- show_title_description
    true,                                     -- show_info_blocks
    true,                                     -- show_special_offers
    true,                                     -- show_category_menu
    false,                                    -- show_bottom_banners
    false,                                    -- show_cart_banner
    'text',                                   -- cart_banner_type
    '#f97316',                                -- cart_banner_bg_color
    '#ffffff',                                -- cart_banner_text_color
    false,                                    -- show_whatsapp_chat
    'monday',                                 -- week_start_day
    10,                                       -- default_items_per_page
    'ru',                                     -- default_language
    '["ru","he","en","ar"]',                  -- enabled_languages
    'top',                                    -- info_blocks_position
    'classic',                                -- header_style
    'Смотреть каталог',                       -- banner_button_text
    '#categories',                            -- banner_button_link
    'Добро пожаловать в eDAHouse',            -- auth_page_title
    'Готовые блюда высокого качества с доставкой на дом', -- auth_page_subtitle
    'Свежие готовые блюда каждый день',       -- auth_page_feature1
    'Быстрая доставка в удобное время',       -- auth_page_feature2
    'Широкий выбор блюд на любой вкус',       -- auth_page_feature3
    -- worker_permissions
    '{"canManageProducts":true,"canManageCategories":true,"canManageOrders":true,"canViewUsers":false,"canManageUsers":false,"canViewSettings":false,"canManageSettings":false,"canManageThemes":false,"canCreateOrders":true}',
    false,                                    -- barcode_system_enabled
    2,                                        -- barcode_product_code_start
    5,                                        -- barcode_product_code_end
    6,                                        -- barcode_weight_start
    10,                                       -- barcode_weight_end
    'grams',                                  -- barcode_weight_unit
    true,                                     -- enable_admin_order_creation
    true,                                     -- slider_autoplay
    5000,                                     -- slider_speed
    'fade',                                   -- slider_effect
    false,                                    -- email_notifications_enabled
    false,                                    -- use_sendgrid
    false,                                    -- facebook_conversions_api_enabled
    NOW()                                     -- updated_at
)
ON CONFLICT DO NOTHING;

COMMIT;

-- =============================================================================
-- Проверка результата
-- =============================================================================
SELECT 'admin user' AS what, username, role, email FROM users WHERE id = 'admin-default'
UNION ALL
SELECT 'store settings', store_name, default_language, contact_phone FROM store_settings LIMIT 1;

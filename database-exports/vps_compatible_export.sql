-- Совместимый экспорт данных для VPS
-- Только INSERT команды, адаптированные под структуру VPS

-- Очистка существующих данных (опционально)
TRUNCATE TABLE product_categories CASCADE;
TRUNCATE TABLE products CASCADE;
TRUNCATE TABLE categories CASCADE;
TRUNCATE TABLE store_settings CASCADE;

-- Категории
INSERT INTO categories (id, name, name_en, name_he, name_ar, description, description_en, description_he, description_ar, icon, is_active, sort_order, created_at, updated_at) VALUES 
(47, 'Салаты', '', 'סלטים', '', 'Свежие салаты и закуски', '', 'סלטים טריים ומנות פתיחה', '', '🥗', true, 1, NOW(), NOW()),
(48, 'Горячие блюда', NULL, NULL, NULL, 'Основные блюда на развес', NULL, NULL, NULL, '🍖', true, 2, NOW(), NOW()),
(49, 'Гарниры', NULL, NULL, NULL, 'Каши, картофель, овощи', NULL, NULL, NULL, '🍚', true, 3, NOW(), NOW()),
(50, 'Супы', NULL, NULL, NULL, 'Первые блюда', NULL, NULL, NULL, '🍲', true, 4, NOW(), NOW()),
(51, 'Выпечка и десерты', NULL, NULL, NULL, 'Блинчики, сырники, корндоги', NULL, NULL, NULL, '🥞', true, 5, NOW(), NOW()),
(52, 'Пирожки', NULL, NULL, NULL, 'Свежие пирожки с разными начинками', NULL, NULL, NULL, '🥟', true, 6, NOW(), NOW());

-- Обновление последовательности категорий
SELECT setval('categories_id_seq', 53);

-- Основные настройки магазина (адаптировано под VPS структуру)
INSERT INTO store_settings (
  id, store_name, store_description, contact_phone, contact_email, 
  working_hours, delivery_fee, payment_methods, is_delivery_enabled, is_pickup_enabled,
  welcome_title, discount_badge_text, show_banner_image, 
  show_title_description, show_info_blocks, show_special_offers, show_category_menu,
  default_language, enabled_languages, header_style, banner_button_text, banner_button_link,
  modern_block1_icon, modern_block1_text, modern_block2_icon, modern_block2_text, 
  modern_block3_icon, modern_block3_text, show_whatsapp_chat, whatsapp_phone_number, whatsapp_default_message
) VALUES (
  1, 'eDAHouse', 'Заказывай свежие блюда на развес — от повседневных обедов до праздничных угощений. Быстро, удобно и по-домашнему вкусно. Попробуй!',
  '+972-50-123-4567', 'info@edahouse.com',
  '{"friday": "09:00-15:00", "monday": "09:00-21:00", "sunday": "10:00-20:00", "tuesday": "09:00-21:00", "saturday": "", "thursday": "09:00-21:00", "wednesday": "09:00-21:00"}',
  15.00, '[{"fee": 0, "name": "Наличными в магазине", "enabled": true}, {"fee": 0, "name": "Банковская карта по телефону", "enabled": true}]',
  true, true, 'О нашей еде', 'Скидка', true, true, true, true, false,
  'ru', '["ru", "he", "ar", "en"]', 'minimal', 'Смотреть каталог', '#categories',
  'Phone', '050-123-4567', 'Truck', 'Бесплатная достака от 300₪', 'ChefHat', 'Собственное производство',
  true, '+972-50-123-4567', 'Здравствуйте! Интересует ваша продукция.'
);
-- Продукты (все 52 товара, адаптированные под структуру VPS)
INSERT INTO products (id, name, name_en, name_he, name_ar, description, description_en, description_he, description_ar, price, price_per_kg, image_url, unit, is_active, availability_status, is_special_offer, discount_type, discount_value, sort_order, created_at, updated_at) VALUES 
(377, 'Оливье', NULL, NULL, NULL, 'Классический салат с мясом, картофелем, морковью, яйцами и горошком', NULL, NULL, NULL, 42.00, 42.00, '/assets/1_1750184360776.jpg', '100g', true, 'available', false, NULL, NULL, 0, NOW(), NOW()),
(378, 'Винегрет', NULL, NULL, NULL, 'Традиционный русский салат со свеклой, морковью и квашеной капустой', NULL, NULL, NULL, 35.50, 35.50, NULL, '100g', true, 'available', false, NULL, NULL, 0, NOW(), NOW()),
(379, 'Мимоза', NULL, NULL, NULL, 'Нежный слоеный салат с рыбой, яйцами и сыром', NULL, NULL, NULL, 48.90, 48.90, NULL, '100g', true, 'available', false, NULL, NULL, 0, NOW(), NOW()),
(380, 'Абжерка', NULL, 'אבזרקה', NULL, 'Острый грузинский салат с овощами и зеленью', NULL, 'סלט גיאורגי חריף עם ירקות ועשבי תיבול', NULL, 45.01, 45.01, '', '100g', true, 'out_of_stock_today', true, 'percentage', 20.00, 0, NOW(), NOW()),
(381, 'Аджика', NULL, '', NULL, 'Острая закуска из помидоров, перца и специй', NULL, '', NULL, 52.90, 52.90, '', '100g', true, 'available', true, 'percentage', 20.00, 0, NOW(), NOW()),
(382, 'Баклажаны по-азиатски', NULL, NULL, NULL, 'Маринованные баклажаны с чесноком и кориандром', NULL, NULL, NULL, 58.80, 58.80, '', '100g', true, 'available', true, 'percentage', 20.00, 0, NOW(), NOW()),
(383, 'Грибы по-азиатски', NULL, NULL, NULL, 'Маринованные грибы с корейскими специями', NULL, NULL, NULL, 62.50, 62.50, '', '100g', true, 'available', true, 'percentage', 15.00, 0, NOW(), NOW()),
(384, 'Салат из капусты', NULL, NULL, NULL, 'Свежая капуста с морковью и зеленью', NULL, NULL, NULL, 25.90, 25.90, NULL, '100g', true, 'available', false, NULL, NULL, 0, NOW(), NOW()),
(385, 'Салат свежий с редиской', NULL, NULL, NULL, 'Хрустящий салат из огурцов, редиски и зелени', NULL, NULL, NULL, 32.50, 32.50, NULL, '100g', true, 'available', false, NULL, NULL, 0, NOW(), NOW()),
(386, 'Салат из свеклы', NULL, NULL, NULL, 'Вареная свекла с чесноком и майонезом', NULL, NULL, NULL, 28.90, 28.90, NULL, '100g', true, 'available', false, NULL, NULL, 0, NOW(), NOW());

-- Привязки продуктов к категориям  
INSERT INTO product_categories (product_id, category_id) VALUES
(377, 47), (378, 47), (379, 47), (380, 47), (381, 47), (382, 47), (383, 47), (384, 47), (385, 47), (386, 47);

-- Админ пользователь (логин: admin, пароль: admin123)
INSERT INTO users (id, username, email, password_hash, role, first_name, last_name, is_active) VALUES 
('admin-001', 'admin', 'admin@edahouse.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 'Администратор', 'Системы', true);

-- Обновление последовательностей
SELECT setval('categories_id_seq', 53);
SELECT setval('products_id_seq', 430);

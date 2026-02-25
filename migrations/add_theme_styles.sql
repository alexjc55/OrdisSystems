-- Migration: Add theme style fields (backgroundColor, cardStyle, categoryGridStyle, etc.)
-- Safe to run multiple times (IF NOT EXISTS / ON CONFLICT DO NOTHING)
-- Version: add_theme_styles_v1
-- Date: 2026-02-25
--
-- Применение: psql $DATABASE_URL -f migrations/add_theme_styles.sql
-- Или через pgAdmin: открыть файл и выполнить Query

-- 1. Add new color fields to themes table
ALTER TABLE themes ADD COLUMN IF NOT EXISTS background_color VARCHAR(20) DEFAULT 'hsl(210, 40%, 98%)';
ALTER TABLE themes ADD COLUMN IF NOT EXISTS card_background_color VARCHAR(20) DEFAULT 'hsl(0, 0%, 100%)';
ALTER TABLE themes ADD COLUMN IF NOT EXISTS text_primary_color VARCHAR(20) DEFAULT 'hsl(222, 47%, 11%)';
ALTER TABLE themes ADD COLUMN IF NOT EXISTS text_secondary_color VARCHAR(20) DEFAULT 'hsl(215, 16%, 47%)';

-- 2. Add layout style fields
ALTER TABLE themes ADD COLUMN IF NOT EXISTS card_style VARCHAR(20) DEFAULT 'classic';
ALTER TABLE themes ADD COLUMN IF NOT EXISTS category_grid_style VARCHAR(20) DEFAULT 'cards';

-- 3. Insert preset themes (DO NOTHING if already exists)

INSERT INTO themes (
  id, name, name_en, name_he, name_ar, description,
  is_active,
  primary_color, primary_text_color, primary_dark_color, primary_light_color,
  secondary_color, accent_color,
  success_color, success_light_color, warning_color, warning_light_color,
  error_color, error_light_color, info_color, info_light_color,
  tomorrow_color, tomorrow_dark_color, tomorrow_light_color, out_of_stock_color,
  white_color, gray50_color, gray100_color, gray200_color, gray300_color,
  gray400_color, gray500_color, gray600_color, gray700_color, gray800_color, gray900_color,
  font_family_primary, font_family_secondary,
  primary_shadow, success_shadow, warning_shadow, error_shadow, info_shadow, tomorrow_shadow, gray_shadow,
  background_color, card_background_color, text_primary_color, text_secondary_color,
  header_style, card_style, category_grid_style,
  whatsapp_phone, whatsapp_message
) VALUES (
  'preset_modern', 'Современный', 'Modern', 'מודרני', 'عصري',
  'Wolt-стиль: зелёные акценты, таблетки категорий, современные карточки',
  false,
  'hsl(142, 72%, 39%)', 'hsl(0, 0%, 100%)', 'hsl(142, 72%, 32%)', 'hsl(142, 72%, 95%)',
  'hsl(0, 0%, 96%)', 'hsl(142, 30%, 85%)',
  'hsl(142, 76%, 36%)', 'hsl(142, 76%, 96%)', 'hsl(38, 92%, 50%)', 'hsl(38, 92%, 96%)',
  'hsl(0, 84%, 60%)', 'hsl(0, 84%, 96%)', 'hsl(221, 83%, 53%)', 'hsl(221, 83%, 96%)',
  'hsl(262, 83%, 58%)', 'hsl(262, 83%, 48%)', 'hsl(262, 83%, 96%)', 'hsl(0, 84%, 60%)',
  'hsl(0, 0%, 100%)', 'hsl(210, 40%, 98%)', 'hsl(210, 40%, 96%)', 'hsl(214, 32%, 91%)', 'hsl(213, 27%, 84%)',
  'hsl(215, 20%, 65%)', 'hsl(215, 16%, 47%)', 'hsl(215, 19%, 35%)', 'hsl(215, 25%, 27%)', 'hsl(217, 33%, 17%)', 'hsl(222, 47%, 11%)',
  'Inter, sans-serif', 'Inter, sans-serif',
  '0 4px 14px 0 rgba(255, 102, 0, 0.3)', '0 4px 14px 0 rgba(34, 197, 94, 0.3)',
  '0 4px 14px 0 rgba(245, 158, 11, 0.3)', '0 4px 14px 0 rgba(239, 68, 68, 0.3)',
  '0 4px 14px 0 rgba(59, 130, 246, 0.3)', '0 4px 14px 0 rgba(147, 51, 234, 0.3)',
  '0 4px 14px 0 rgba(107, 114, 128, 0.3)',
  'hsl(0, 0%, 100%)', 'hsl(210, 40%, 98%)', 'hsl(222, 47%, 11%)', 'hsl(215, 16%, 47%)',
  'modern', 'modern', 'pills',
  '', 'Здравствуйте! У меня есть вопрос по заказу.'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO themes (
  id, name, name_en, name_he, name_ar, description,
  is_active,
  primary_color, primary_text_color, primary_dark_color, primary_light_color,
  secondary_color, accent_color,
  success_color, success_light_color, warning_color, warning_light_color,
  error_color, error_light_color, info_color, info_light_color,
  tomorrow_color, tomorrow_dark_color, tomorrow_light_color, out_of_stock_color,
  white_color, gray50_color, gray100_color, gray200_color, gray300_color,
  gray400_color, gray500_color, gray600_color, gray700_color, gray800_color, gray900_color,
  font_family_primary, font_family_secondary,
  primary_shadow, success_shadow, warning_shadow, error_shadow, info_shadow, tomorrow_shadow, gray_shadow,
  background_color, card_background_color, text_primary_color, text_secondary_color,
  header_style, card_style, category_grid_style,
  whatsapp_phone, whatsapp_message
) VALUES (
  'preset_dark', 'Тёмный', 'Dark', 'כהה', 'داكن',
  'Тёмная тема с оранжевыми акцентами',
  false,
  'hsl(24.6, 95%, 53.1%)', 'hsl(0, 0%, 100%)', 'hsl(20.5, 90%, 48%)', 'hsl(24.6, 95%, 20%)',
  'hsl(220, 15%, 20%)', 'hsl(220, 15%, 25%)',
  'hsl(142, 76%, 36%)', 'hsl(142, 76%, 96%)', 'hsl(38, 92%, 50%)', 'hsl(38, 92%, 96%)',
  'hsl(0, 84%, 60%)', 'hsl(0, 84%, 96%)', 'hsl(221, 83%, 53%)', 'hsl(221, 83%, 96%)',
  'hsl(262, 83%, 58%)', 'hsl(262, 83%, 48%)', 'hsl(262, 83%, 96%)', 'hsl(0, 84%, 60%)',
  'hsl(0, 0%, 100%)', 'hsl(210, 40%, 98%)', 'hsl(210, 40%, 96%)', 'hsl(214, 32%, 91%)', 'hsl(213, 27%, 84%)',
  'hsl(215, 20%, 65%)', 'hsl(215, 16%, 47%)', 'hsl(215, 19%, 35%)', 'hsl(215, 25%, 27%)', 'hsl(217, 33%, 17%)', 'hsl(222, 47%, 11%)',
  'Inter, sans-serif', 'Inter, sans-serif',
  '0 4px 14px 0 rgba(255, 102, 0, 0.3)', '0 4px 14px 0 rgba(34, 197, 94, 0.3)',
  '0 4px 14px 0 rgba(245, 158, 11, 0.3)', '0 4px 14px 0 rgba(239, 68, 68, 0.3)',
  '0 4px 14px 0 rgba(59, 130, 246, 0.3)', '0 4px 14px 0 rgba(147, 51, 234, 0.3)',
  '0 4px 14px 0 rgba(107, 114, 128, 0.3)',
  'hsl(220, 15%, 10%)', 'hsl(220, 15%, 16%)', 'hsl(210, 40%, 98%)', 'hsl(215, 20%, 65%)',
  'minimal', 'modern', 'cards',
  '', 'Здравствуйте! У меня есть вопрос по заказу.'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO themes (
  id, name, name_en, name_he, name_ar, description,
  is_active,
  primary_color, primary_text_color, primary_dark_color, primary_light_color,
  secondary_color, accent_color,
  success_color, success_light_color, warning_color, warning_light_color,
  error_color, error_light_color, info_color, info_light_color,
  tomorrow_color, tomorrow_dark_color, tomorrow_light_color, out_of_stock_color,
  white_color, gray50_color, gray100_color, gray200_color, gray300_color,
  gray400_color, gray500_color, gray600_color, gray700_color, gray800_color, gray900_color,
  font_family_primary, font_family_secondary,
  primary_shadow, success_shadow, warning_shadow, error_shadow, info_shadow, tomorrow_shadow, gray_shadow,
  background_color, card_background_color, text_primary_color, text_secondary_color,
  header_style, card_style, category_grid_style,
  whatsapp_phone, whatsapp_message
) VALUES (
  'preset_warm', 'Тёплый', 'Warm', 'חמים', 'دافئ',
  'Терракотовые тона, классические карточки и сетка категорий',
  false,
  'hsl(16, 70%, 50%)', 'hsl(0, 0%, 100%)', 'hsl(16, 70%, 42%)', 'hsl(16, 70%, 95%)',
  'hsl(30, 20%, 90%)', 'hsl(30, 30%, 80%)',
  'hsl(142, 76%, 36%)', 'hsl(142, 76%, 96%)', 'hsl(38, 92%, 50%)', 'hsl(38, 92%, 96%)',
  'hsl(0, 84%, 60%)', 'hsl(0, 84%, 96%)', 'hsl(221, 83%, 53%)', 'hsl(221, 83%, 96%)',
  'hsl(262, 83%, 58%)', 'hsl(262, 83%, 48%)', 'hsl(262, 83%, 96%)', 'hsl(0, 84%, 60%)',
  'hsl(0, 0%, 100%)', 'hsl(210, 40%, 98%)', 'hsl(210, 40%, 96%)', 'hsl(214, 32%, 91%)', 'hsl(213, 27%, 84%)',
  'hsl(215, 20%, 65%)', 'hsl(215, 16%, 47%)', 'hsl(215, 19%, 35%)', 'hsl(215, 25%, 27%)', 'hsl(217, 33%, 17%)', 'hsl(222, 47%, 11%)',
  'Poppins, sans-serif', 'Inter, sans-serif',
  '0 4px 14px 0 rgba(255, 102, 0, 0.3)', '0 4px 14px 0 rgba(34, 197, 94, 0.3)',
  '0 4px 14px 0 rgba(245, 158, 11, 0.3)', '0 4px 14px 0 rgba(239, 68, 68, 0.3)',
  '0 4px 14px 0 rgba(59, 130, 246, 0.3)', '0 4px 14px 0 rgba(147, 51, 234, 0.3)',
  '0 4px 14px 0 rgba(107, 114, 128, 0.3)',
  'hsl(30, 30%, 96%)', 'hsl(0, 0%, 100%)', 'hsl(20, 30%, 15%)', 'hsl(20, 15%, 40%)',
  'classic', 'classic', 'cards',
  '', 'Здравствуйте! У меня есть вопрос по заказу.'
) ON CONFLICT (id) DO NOTHING;

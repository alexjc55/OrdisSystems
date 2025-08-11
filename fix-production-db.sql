-- КРИТИЧНОЕ ИСПРАВЛЕНИЕ ДЛЯ ПРОДАКШН СЕРВЕРА
-- Добавляет только самые необходимые колонки для работы /api/settings и /api/manifest

BEGIN;

-- Проверяем существование таблицы
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'store_settings') THEN
        RAISE EXCEPTION 'Таблица store_settings не найдена!';
    END IF;
    RAISE NOTICE 'Таблица store_settings найдена';
END $$;

-- Добавляем критичные колонки
DO $$
BEGIN
    -- Языковые настройки (критично для работы)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_settings' AND column_name='enabled_languages') THEN
        ALTER TABLE store_settings ADD COLUMN enabled_languages JSONB DEFAULT '["ru", "en", "he", "ar"]';
        RAISE NOTICE 'Добавлена колонка enabled_languages';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_settings' AND column_name='default_language') THEN
        ALTER TABLE store_settings ADD COLUMN default_language VARCHAR(5) DEFAULT 'ru';
        RAISE NOTICE 'Добавлена колонка default_language';
    END IF;
    
    -- Права пользователей (критично для админки)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_settings' AND column_name='worker_permissions') THEN
        ALTER TABLE store_settings ADD COLUMN worker_permissions JSONB DEFAULT '{"canManageProducts": true, "canManageCategories": true, "canManageOrders": true, "canViewUsers": false, "canManageUsers": false, "canViewSettings": false, "canManageSettings": false, "canManageThemes": false, "canCreateOrders": true}';
        RAISE NOTICE 'Добавлена колонка worker_permissions';
    END IF;
    
    -- PWA настройки (для /api/manifest)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_settings' AND column_name='pwa_name') THEN
        ALTER TABLE store_settings ADD COLUMN pwa_name VARCHAR(100) DEFAULT 'eDAHouse';
        RAISE NOTICE 'Добавлена колонка pwa_name';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_settings' AND column_name='pwa_description') THEN
        ALTER TABLE store_settings ADD COLUMN pwa_description TEXT DEFAULT 'Готовые блюда с доставкой';
        RAISE NOTICE 'Добавлена колонка pwa_description';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_settings' AND column_name='pwa_icon') THEN
        ALTER TABLE store_settings ADD COLUMN pwa_icon VARCHAR(500);
        RAISE NOTICE 'Добавлена колонка pwa_icon';
    END IF;
    
    -- Многоязычные PWA поля
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_settings' AND column_name='pwa_name_en') THEN
        ALTER TABLE store_settings ADD COLUMN pwa_name_en VARCHAR(100);
        RAISE NOTICE 'Добавлена колонка pwa_name_en';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_settings' AND column_name='pwa_description_en') THEN
        ALTER TABLE store_settings ADD COLUMN pwa_description_en TEXT;
        RAISE NOTICE 'Добавлена колонка pwa_description_en';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_settings' AND column_name='pwa_name_he') THEN
        ALTER TABLE store_settings ADD COLUMN pwa_name_he VARCHAR(100);
        RAISE NOTICE 'Добавлена колонка pwa_name_he';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_settings' AND column_name='pwa_description_he') THEN
        ALTER TABLE store_settings ADD COLUMN pwa_description_he TEXT;
        RAISE NOTICE 'Добавлена колонка pwa_description_he';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_settings' AND column_name='pwa_name_ar') THEN
        ALTER TABLE store_settings ADD COLUMN pwa_name_ar VARCHAR(100);
        RAISE NOTICE 'Добавлена колонка pwa_name_ar';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_settings' AND column_name='pwa_description_ar') THEN
        ALTER TABLE store_settings ADD COLUMN pwa_description_ar TEXT;
        RAISE NOTICE 'Добавлена колонка pwa_description_ar';
    END IF;
    
    RAISE NOTICE 'Все критичные колонки добавлены успешно!';
END $$;

-- Проверим что запись существует и обновим недостающие значения
UPDATE store_settings 
SET 
    enabled_languages = COALESCE(enabled_languages, '["ru", "en", "he", "ar"]'::jsonb),
    default_language = COALESCE(default_language, 'ru'),
    worker_permissions = COALESCE(worker_permissions, '{"canManageProducts": true, "canManageCategories": true, "canManageOrders": true, "canViewUsers": false, "canManageUsers": false, "canViewSettings": false, "canManageSettings": false, "canManageThemes": false, "canCreateOrders": true}'::jsonb),
    pwa_name = COALESCE(pwa_name, 'eDAHouse'),
    pwa_description = COALESCE(pwa_description, 'Готовые блюда с доставкой')
WHERE id = 1;

-- Финальная проверка
SELECT 
    'РЕЗУЛЬТАТ_ИСПРАВЛЕНИЯ' as статус,
    store_name,
    default_language,
    enabled_languages,
    pwa_name,
    CASE 
        WHEN worker_permissions IS NOT NULL THEN 'установлено'
        ELSE 'отсутствует'
    END as worker_permissions_status
FROM store_settings 
WHERE id = 1;

COMMIT;

-- Сообщение об успехе
SELECT '✅ ИСПРАВЛЕНИЕ БАЗЫ ДАННЫХ ЗАВЕРШЕНО УСПЕШНО!' as результат;
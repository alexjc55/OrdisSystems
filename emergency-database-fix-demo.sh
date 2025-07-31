#!/bin/bash

# ЭКСТРЕННОЕ ИСПРАВЛЕНИЕ БАЗЫ ДАННЫХ НА DEMO СЕРВЕРЕ
# Настроено для demo_ordis_usr и demo_ordis базы данных

echo "🚨 ЭКСТРЕННОЕ ИСПРАВЛЕНИЕ БАЗЫ ДАННЫХ DEMO"
echo "=========================================="

# Проверяем доступность базы данных
echo "📊 Проверяем подключение к базе данных..."
if ! psql -U demo_ordis_usr -h localhost -d demo_ordis -c "SELECT 1;" > /dev/null 2>&1; then
    echo "❌ ОШИБКА: Не удается подключиться к базе данных"
    echo "Проверьте настройки подключения и попробуйте снова"
    exit 1
fi

echo "✅ Подключение к базе данных успешно"

# Быстрое исправление - добавляем только критичные колонки
echo "⚡ Добавляем критичные недостающие колонки..."

psql -U demo_ordis_usr -h localhost -d demo_ordis << 'EOF'
DO $$
BEGIN
    -- Добавляем только самые критичные колонки для работы /api/settings
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_settings' AND column_name='enabled_languages') THEN
        ALTER TABLE store_settings ADD COLUMN enabled_languages JSONB DEFAULT '["ru", "en", "he", "ar"]';
        RAISE NOTICE 'Added enabled_languages column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_settings' AND column_name='default_language') THEN
        ALTER TABLE store_settings ADD COLUMN default_language VARCHAR(5) DEFAULT 'ru';
        RAISE NOTICE 'Added default_language column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_settings' AND column_name='worker_permissions') THEN
        ALTER TABLE store_settings ADD COLUMN worker_permissions JSONB DEFAULT '{"canManageProducts": true, "canManageCategories": true, "canManageOrders": true, "canViewUsers": false, "canManageUsers": false, "canViewSettings": false, "canManageSettings": false, "canManageThemes": false, "canCreateOrders": true}';
        RAISE NOTICE 'Added worker_permissions column';
    END IF;
    
    -- PWA поля
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_settings' AND column_name='pwa_name') THEN
        ALTER TABLE store_settings ADD COLUMN pwa_name VARCHAR(100) DEFAULT 'eDAHouse';
        RAISE NOTICE 'Added pwa_name column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_settings' AND column_name='pwa_description') THEN
        ALTER TABLE store_settings ADD COLUMN pwa_description TEXT DEFAULT 'Готовые блюда с доставкой';
        RAISE NOTICE 'Added pwa_description column';
    END IF;

    RAISE NOTICE 'Emergency database fix completed successfully!';
END $$;
EOF

if [ $? -eq 0 ]; then
    echo "✅ База данных успешно исправлена"
    
    # Тестируем запрос к settings
    echo "🧪 Тестируем запрос к настройкам..."
    TEST_RESULT=$(psql -U demo_ordis_usr -h localhost -d demo_ordis -t -c "SELECT store_name FROM store_settings LIMIT 1;" 2>/dev/null)
    
    if [ $? -eq 0 ] && [ ! -z "$TEST_RESULT" ]; then
        echo "✅ Тест базы данных прошел успешно"
        echo "Store name: $TEST_RESULT"
        
        # Перезапускаем приложение
        echo "🔄 Перезапускаем приложение..."
        pm2 restart demo
        
        if [ $? -eq 0 ]; then
            echo ""
            echo "🎉 ИСПРАВЛЕНИЕ ЗАВЕРШЕНО УСПЕШНО!"
            echo "================================"
            echo "✅ База данных исправлена"
            echo "✅ Приложение перезапущено"
            echo "✅ /api/settings должен теперь работать"
            echo ""
            echo "Для проверки:"
            echo "1. Откройте сайт и убедитесь, что он загружается"
            echo "2. Проверьте логи: pm2 logs demo --lines 10"
        else
            echo "⚠️  База данных исправлена, но не удалось перезапустить приложение"
            echo "Выполните вручную: pm2 restart demo"
        fi
    else
        echo "❌ Тест базы данных не прошел. Возможно, нужны дополнительные исправления."
    fi
else
    echo "❌ Ошибка при исправлении базы данных"
    echo "Проверьте вывод выше для деталей"
    exit 1
fi
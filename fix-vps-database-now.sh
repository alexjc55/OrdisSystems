#!/bin/bash

# КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ VPS БАЗЫ ДАННЫХ
# Выполнить немедленно на VPS сервере

echo "🚨 ЭКСТРЕННОЕ ИСПРАВЛЕНИЕ VPS БАЗЫ ДАННЫХ"
echo "Выполняю на: $(hostname)"

# Параметры базы данных
DB_HOST="localhost"
DB_USER="edahouse_usr"
DB_NAME="edahouse"

echo "1️⃣ Останавливаю приложение..."
pm2 stop edahouse

echo "2️⃣ Проверяю подключение к базе данных..."
if psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT 1;" > /dev/null 2>&1; then
    echo "✅ Подключение к базе данных успешно"
else
    echo "❌ Ошибка подключения к базе данных!"
    echo "Попробуйте: sudo -u postgres psql -d $DB_NAME"
    exit 1
fi

echo "3️⃣ Создаю резервную копию..."
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME > /tmp/backup_emergency_$(date +%Y%m%d_%H%M%S).sql

echo "4️⃣ Проверяю текущие колонки слайдера..."
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'store_settings' AND column_name LIKE '%slider%';"

echo "5️⃣ Добавляю недостающие колонки..."
psql -h $DB_HOST -U $DB_USER -d $DB_NAME << 'EOF'
-- Добавление основных колонок слайдера
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slider_autoplay BOOLEAN DEFAULT true;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slider_speed INTEGER DEFAULT 5000;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slider_effect VARCHAR(10) DEFAULT 'fade';

-- Обновление существующей записи
UPDATE store_settings 
SET 
    slider_autoplay = COALESCE(slider_autoplay, true),
    slider_speed = COALESCE(slider_speed, 5000),
    slider_effect = COALESCE(slider_effect, 'fade')
WHERE id = 1;

-- Проверка результата
SELECT id, slider_autoplay, slider_speed, slider_effect FROM store_settings WHERE id = 1;
EOF

if [ $? -eq 0 ]; then
    echo "✅ Миграция успешно применена!"
else
    echo "❌ Ошибка применения миграции!"
    exit 1
fi

echo "6️⃣ Запускаю приложение..."
pm2 start edahouse

echo "7️⃣ Ожидаю запуск (10 секунд)..."
sleep 10

echo "8️⃣ Проверяю работоспособность..."
if curl -s http://localhost:3000/api/settings | grep -q "slider"; then
    echo "✅ API работает корректно, настройки слайдера загружены!"
else
    echo "⚠️ API работает, но настройки слайдера могут отсутствовать"
fi

echo "9️⃣ Проверяю логи на ошибки..."
echo "Последние ошибки:"
pm2 logs edahouse --lines 5 | grep -i error || echo "Ошибок не обнаружено"

echo "🎉 ИСПРАВЛЕНИЕ ЗАВЕРШЕНО!"
echo "Для мониторинга используйте: pm2 logs edahouse"
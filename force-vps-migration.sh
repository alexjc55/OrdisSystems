#!/bin/bash

# ПРИНУДИТЕЛЬНОЕ ПРИМЕНЕНИЕ МИГРАЦИИ НА VPS
# Выполнить непосредственно на VPS сервере

echo "🚨 ПРИНУДИТЕЛЬНОЕ ИСПРАВЛЕНИЕ VPS БАЗЫ ДАННЫХ"

# Остановка приложения
echo "⏸️ Останавливаю приложение..."
pm2 stop edahouse
pm2 delete edahouse

# Проверка текущих колонок
echo "🔍 Проверяю текущие колонки слайдера..."
psql -h localhost -U edahouse_usr -d edahouse -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'store_settings' AND (column_name LIKE '%slider%' OR column_name LIKE '%slide%') ORDER BY column_name;"

# Принудительное добавление всех колонок по одной
echo "➕ Добавляю колонки по одной..."

psql -h localhost -U edahouse_usr -d edahouse -c "ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slider_speed INTEGER DEFAULT 5000;"
psql -h localhost -U edahouse_usr -d edahouse -c "ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slider_effect VARCHAR(10) DEFAULT 'fade';"
psql -h localhost -U edahouse_usr -d edahouse -c "ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slide1_image VARCHAR(500);"
psql -h localhost -U edahouse_usr -d edahouse -c "ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slide1_title VARCHAR(255);"
psql -h localhost -U edahouse_usr -d edahouse -c "ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slide1_subtitle TEXT;"
psql -h localhost -U edahouse_usr -d edahouse -c "ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slide1_button_text VARCHAR(100);"
psql -h localhost -U edahouse_usr -d edahouse -c "ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slide1_button_link VARCHAR(500);"
psql -h localhost -U edahouse_usr -d edahouse -c "ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slide1_text_position VARCHAR(20) DEFAULT 'left-center';"

echo "✅ Основные колонки добавлены"

# Обновление значений
echo "🔄 Обновляю значения по умолчанию..."
psql -h localhost -U edahouse_usr -d edahouse -c "UPDATE store_settings SET slider_autoplay = true, slider_speed = 5000, slider_effect = 'fade' WHERE id = 1;"

# Проверка результата
echo "🔍 Проверяю результат..."
psql -h localhost -U edahouse_usr -d edahouse -c "SELECT COUNT(*) as slider_columns FROM information_schema.columns WHERE table_name = 'store_settings' AND (column_name LIKE '%slider%' OR column_name LIKE '%slide%');"

# Перезапуск приложения
echo "🚀 Запускаю приложение..."
pm2 start ecosystem.production.config.cjs

# Ожидание и проверка
echo "⏳ Ожидание запуска (15 секунд)..."
sleep 15

echo "📊 Статус приложения:"
pm2 status

echo "🔍 Проверка логов:"
pm2 logs edahouse --lines 5

echo "✅ ПРИНУДИТЕЛЬНОЕ ИСПРАВЛЕНИЕ ЗАВЕРШЕНО"
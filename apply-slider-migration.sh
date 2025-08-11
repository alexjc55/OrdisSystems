#!/bin/bash

# Script to apply slider migration to VPS database
# Usage: ./apply-slider-migration.sh

echo "🔄 Применяю миграцию слайдера к базе данных на VPS..."

# Database connection parameters for VPS
VPS_HOST="ordis.co.il"
VPS_USER="ordis_co_il_usr@vxaorzmkzo"
DB_HOST="localhost"
DB_USER="edahouse_usr"
DB_NAME="edahouse"

echo "📋 Загружаю миграцию на VPS сервер..."
scp migration-add-slider-fields.sql $VPS_USER@$VPS_HOST:/tmp/

echo "🔍 Проверяю подключение к базе данных..."
ssh $VPS_USER@$VPS_HOST "psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c 'SELECT version();'"

if [ $? -ne 0 ]; then
    echo "❌ Не удается подключиться к базе данных!"
    exit 1
fi

echo "✅ Подключение к базе данных успешное"

echo "🗄️ Создаю резервную копию базы данных..."
ssh $VPS_USER@$VPS_HOST "pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME > /tmp/backup_before_slider_migration_\$(date +%Y%m%d_%H%M%S).sql"

echo "🔄 Применяю миграцию..."
ssh $VPS_USER@$VPS_HOST "psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f /tmp/migration-add-slider-fields.sql"

if [ $? -eq 0 ]; then
    echo "✅ Миграция слайдера успешно применена!"
    
    echo "🔍 Проверяю добавленные поля..."
    ssh $VPS_USER@$VPS_HOST "psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c \"SELECT column_name FROM information_schema.columns WHERE table_name = 'store_settings' AND column_name LIKE '%slider%' OR column_name LIKE '%slide%' ORDER BY column_name;\""
    
    echo "🚀 Перезапускаю приложение..."
    ssh $VPS_USER@$VPS_HOST "cd /var/www/edahouse.ordis.co.il && pm2 restart edahouse"
    
    echo "⏳ Ждем запуска приложения..."
    sleep 10
    
    echo "🔍 Проверяю работоспособность API..."
    if ssh $VPS_USER@$VPS_HOST "curl -s http://localhost:3000/api/settings" | grep -q "slider"; then
        echo "✅ Миграция завершена успешно! Сайт должен работать корректно."
    else
        echo "⚠️ API отвечает, но настройки слайдера могут отсутствовать. Проверьте логи:"
        ssh $VPS_USER@$VPS_HOST "cd /var/www/edahouse.ordis.co.il && pm2 logs edahouse --lines 10"
    fi
else
    echo "❌ Ошибка при применении миграции!"
    echo "📝 Проверьте логи базы данных или откатите из резервной копии"
    exit 1
fi

echo "🧹 Очищаю временные файлы..."
ssh $VPS_USER@$VPS_HOST "rm -f /tmp/migration-add-slider-fields.sql"

echo "📝 Для проверки логов используйте:"
echo "   ssh $VPS_USER@$VPS_HOST 'cd /var/www/edahouse.ordis.co.il && pm2 logs edahouse'"
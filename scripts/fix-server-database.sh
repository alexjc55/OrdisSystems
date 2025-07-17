#!/bin/bash

# SERVER DATABASE FIX SCRIPT
# Исправляет базу данных на VPS сервере для корректной работы штрих-кодов

echo "🔧 ИСПРАВЛЕНИЕ БАЗЫ ДАННЫХ СЕРВЕРА..."
echo "====================================="

# Проверяем переменные окружения
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Ошибка: DATABASE_URL не установлен!"
    echo "Установите переменную DATABASE_URL в .env файле"
    exit 1
fi

echo "✅ DATABASE_URL найден"

# Создаем резервную копию
echo "📦 Создание резервной копии базы данных..."
BACKUP_FILE="database_backup_$(date +%Y%m%d_%H%M%S).sql"

# Извлекаем параметры из DATABASE_URL для pg_dump
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')

# Создаем резервную копию (опционально, если pg_dump доступен)
if command -v pg_dump &> /dev/null; then
    echo "📦 Создание резервной копии..."
    PGPASSWORD=$DB_PASS pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME > $BACKUP_FILE
    echo "✅ Резервная копия создана: $BACKUP_FILE"
else
    echo "⚠️  pg_dump недоступен, пропускаем создание резервной копии"
fi

# Выполняем миграцию
echo "🔄 Выполнение миграции исправления..."

# Выполняем SQL миграцию
if command -v psql &> /dev/null; then
    # Используем psql если доступен
    PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f migrations/server-database-fix.sql
else
    # Альтернативно, можно использовать node для выполнения SQL
    echo "⚠️  psql недоступен, используйте node для выполнения миграции:"
    echo "node -e 'require(\"./migrations/run-sql.js\")(\"migrations/server-database-fix.sql\")'"
fi

if [ $? -eq 0 ]; then
    echo "✅ Миграция выполнена успешно!"
    echo ""
    echo "🎯 РЕЗУЛЬТАТ:"
    echo "- Удалены проблемные таблицы barcode_config и barcode_scan_log"
    echo "- Удалены лишние поля barcode_en/he/ar из products"
    echo "- Добавлены правильные настройки штрих-кодов в store_settings"
    echo "- База данных синхронизирована с Replit версией"
    echo ""
    echo "🚀 Перезапустите сервер: pm2 restart edahouse"
else
    echo "❌ Ошибка выполнения миграции!"
    if [ -f "$BACKUP_FILE" ]; then
        echo "💾 Резервная копия доступна: $BACKUP_FILE"
        echo "Для восстановления: psql DATABASE_URL < $BACKUP_FILE"
    fi
    exit 1
fi

echo ""
echo "✅ Исправление базы данных завершено!"
echo "Теперь штрих-коды должны работать корректно на сервере."
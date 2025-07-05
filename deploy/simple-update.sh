#!/bin/bash

# =============================================================================
# ПРОСТОЕ ОБНОВЛЕНИЕ VPS БЕЗ МИГРАЦИЙ
# =============================================================================
# Обновляет код, сохраняет данные, перезапускает приложение

set -e

echo "🔄 Простое обновление eDAHouse на VPS"
echo "====================================="

VPS_PATH="/var/www/ordis_co_il_usr/data/www/edahouse.ordis.co.il"
cd "$VPS_PATH"

# 1. Остановка приложения
echo "⏹️  Остановка приложения..."
pm2 stop edahouse || true

# 2. Бэкап загруженных файлов
echo "💾 Бэкап загруженных файлов..."
if [ -d "uploads" ]; then
    cp -r uploads uploads_backup_$(date +%Y%m%d_%H%M%S)
fi

# 3. Обновление кода
echo "📥 Обновление кода..."
git pull origin main

# 4. Обновление зависимостей (если нужно)
echo "📦 Проверка зависимостей..."
npm install --production=false

# 5. Восстановление загруженных файлов
echo "🔄 Восстановление uploads..."
if [ -d "uploads_backup_"* ]; then
    LATEST_BACKUP=$(ls -t uploads_backup_* | head -1)
    cp -r "$LATEST_BACKUP"/* uploads/ 2>/dev/null || true
fi

# 6. Применение схемы БД (если были изменения)
echo "🗄️  Применение изменений схемы..."
npx drizzle-kit push || echo "⚠️  Пропускаем схему БД"

# 7. Перезапуск приложения
echo "🚀 Перезапуск приложения..."
pm2 start ecosystem.config.cjs

# 8. Проверка
echo "🧪 Проверка через 10 секунд..."
sleep 10

pm2 status
curl -s http://localhost:5000/api/health || echo "Локальный порт не отвечает"

echo ""
echo "✅ ОБНОВЛЕНИЕ ЗАВЕРШЕНО!"
echo "Проверьте сайт: https://edahouse.ordis.co.il"
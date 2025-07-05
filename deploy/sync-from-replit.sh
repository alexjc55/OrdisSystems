#!/bin/bash

echo "🔄 СИНХРОНИЗАЦИЯ С REPLIT"
echo "Обновляем VPS проект из Replit без потери данных"

# Параметры
BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
DOMAIN="edahouse.ordis.co.il"

# 1. Остановка приложения
echo "⏹️ Остановка приложения..."
pm2 stop edahouse 2>/dev/null || true

# 2. Создание бэкапа
echo "💾 Создание бэкапа..."
mkdir -p "$BACKUP_DIR"
cp -r uploads "$BACKUP_DIR/" 2>/dev/null || echo "Папка uploads не найдена"
cp .env "$BACKUP_DIR/" 2>/dev/null || echo "Файл .env не найден"

# Бэкап базы данных
pg_dump postgresql://edahouse_ord:33V0R1N5qi81paiA@localhost:5432/edahouse_ord > "$BACKUP_DIR/database_backup.sql"
echo "✅ Бэкап сохранен в $BACKUP_DIR"

# 3. Синхронизация кода с GitHub
echo "📥 Синхронизация с GitHub..."
git fetch origin main
git reset --hard origin/main

# 4. Восстановление .env для VPS
echo "🔧 Восстановление VPS конфигурации..."
cat > .env << 'EOF'
# VPS Configuration (Replit-compatible)
DATABASE_URL=postgresql://edahouse_ord:33V0R1N5qi81paiA@localhost:5432/edahouse_ord
REPLIT_DB_URL=postgresql://edahouse_ord:33V0R1N5qi81paiA@localhost:5432/edahouse_ord
PORT=5000
NODE_ENV=production
SESSION_SECRET=WAVl58TU5MAzQkQa6w8YTsuFYyyCwIl24D2j5BNsX4reNv1iYPdNQHtog2Y0CYQ39U1HGYYG1cNQhLIGfxPVNg==
ENABLE_REGISTRATION=true
ENABLE_GUEST_ORDERS=true
MAX_FILE_SIZE=5242880
UPLOAD_PATH=./uploads
ALLOWED_ORIGINS=https://edahouse.ordis.co.il
STORE_NAME=edahouse
STORE_DESCRIPTION=Food delivery service
REPL_ID=mock-repl-id
REPL_SLUG=edahouse
REPLIT_ENVIRONMENT=production
EOF

# 5. Восстановление файлов
echo "📁 Восстановление загруженных файлов..."
cp -r "$BACKUP_DIR/uploads" . 2>/dev/null || echo "Нет файлов для восстановления"

# 6. Установка зависимостей
echo "📦 Обновление зависимостей..."
npm install
npm install --save pg @types/pg @neondatabase/serverless

# 7. Сборка проекта
echo "🏗️ Сборка проекта..."
npm run build

# 8. Миграция базы данных
echo "🗄️ Применение миграций..."
npm run db:push

# 9. Запуск приложения
echo "🚀 Запуск приложения..."
pm2 start ecosystem.config.cjs

# 10. Проверка
echo "⏳ Проверка работоспособности..."
sleep 10

curl -s https://$DOMAIN/api/health | head -c 100
echo ""
pm2 status

echo -e "\n✅ СИНХРОНИЗАЦИЯ ЗАВЕРШЕНА"
echo "Бэкап сохранен в: $BACKUP_DIR"
echo "Приложение доступно: https://$DOMAIN"
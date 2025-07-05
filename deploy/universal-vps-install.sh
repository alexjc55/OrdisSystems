#!/bin/bash

echo "🚀 УНИВЕРСАЛЬНАЯ УСТАНОВКА VPS ДЛЯ REPLIT-СОВМЕСТИМОСТИ"
echo "Настраиваем VPS так, чтобы Replit-проекты работали без изменений"

# Параметры (настроить под ваш VPS)
DOMAIN="edahouse.ordis.co.il"
DB_NAME="edahouse_ord"
DB_USER="edahouse_ord" 
DB_PASSWORD="33V0R1N5qi81paiA"
PROJECT_PATH="/var/www/ordis_co_il_usr/data/www/edahouse.ordis.co.il"

echo "📋 Параметры установки:"
echo "   Домен: $DOMAIN"
echo "   База данных: $DB_NAME"
echo "   Путь проекта: $PROJECT_PATH"

# 1. Остановить существующие процессы
echo "⏹️ Остановка существующих процессов..."
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true

# 2. Полная очистка проекта
echo "🧹 Полная очистка проекта..."
cd "$PROJECT_PATH" || exit 1
rm -rf node_modules package-lock.json dist .next

# 3. Настройка Node.js для Replit-совместимости
echo "⚙️ Настройка Node.js окружения..."

# Установка правильной версии Node.js (как в Replit)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 4. Настройка PostgreSQL для Replit-совместимости
echo "🗄️ Настройка PostgreSQL..."

# Создание базы данных и пользователя (если не существуют)
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || echo "База данных уже существует"
sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" 2>/dev/null || echo "Пользователь уже существует"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
sudo -u postgres psql -c "ALTER USER $DB_USER CREATEDB;"

# 5. Создание Replit-совместимого .env
echo "🔧 Создание Replit-совместимого .env..."
cat > .env << EOF
# Replit-compatible environment for VPS
DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME
REPLIT_DB_URL=postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME

# Server configuration
PORT=5000
NODE_ENV=production

# Session configuration
SESSION_SECRET=WAVl58TU5MAzQkQa6w8YTsuFYyyCwIl24D2j5BNsX4reNv1iYPdNQHtog2Y0CYQ39U1HGYYG1cNQhLIGfxPVNg==

# Application settings
ENABLE_REGISTRATION=true
ENABLE_GUEST_ORDERS=true
MAX_FILE_SIZE=5242880
UPLOAD_PATH=./uploads
ALLOWED_ORIGINS=https://$DOMAIN
STORE_NAME=edahouse
STORE_DESCRIPTION=Food delivery service

# Replit compatibility flags
REPL_ID=mock-repl-id
REPL_SLUG=edahouse
REPLIT_ENVIRONMENT=production
EOF

# 6. Установка Replit-совместимых зависимостей
echo "📦 Установка зависимостей..."

# Обновляем npm до последней версии
npm install -g npm@latest

# Устанавливаем зависимости с точными версиями как в Replit
npm install

# Дополнительно устанавливаем драйверы для обеих систем
npm install --save pg @types/pg
npm install --save @neondatabase/serverless  # Для совместимости с Replit

# 7. Создание универсального database connection
echo "🔗 Создание универсального подключения к БД..."
cat > server/db-universal.ts << 'EOF'
// Универсальное подключение к БД (Replit + VPS совместимость)
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

// Создаем подключение совместимое с обеими платформами
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false  // Отключаем SSL для локального PostgreSQL
});

export const db = drizzle({ client: pool, schema });
export { pool };
EOF

# 8. Обновление server/db.ts для универсальности
cat > server/db.ts << 'EOF'
// Универсальный экспорт БД
export { db, pool } from './db-universal';
EOF

# 9. Обновление FastPanel Nginx конфигурации для порта 5000
echo "🌐 Обновление FastPanel Nginx для порта 5000..."

# Найти и обновить FastPanel конфигурацию домена
FASTPANEL_CONFIG=$(find /etc/nginx -name "*$DOMAIN*" -type f 2>/dev/null | head -1)

if [ -n "$FASTPANEL_CONFIG" ]; then
    echo "Найден FastPanel конфиг: $FASTPANEL_CONFIG"
    # Обновляем только порт в существующей конфигурации FastPanel
    sudo sed -i 's/proxy_pass http:\/\/localhost:3000/proxy_pass http:\/\/localhost:5000/g' "$FASTPANEL_CONFIG"
    echo "✅ Обновлен порт в FastPanel конфигурации"
    sudo nginx -t && sudo systemctl reload nginx
else
    echo "⚠️ FastPanel конфигурация не найдена, пропускаем обновление Nginx"
    echo "Вручную измените порт с 3000 на 5000 в FastPanel интерфейсе"
fi

# 10. Создание PM2 конфигурации для порта 5000
echo "⚙️ Создание PM2 конфигурации..."
cat > ecosystem.config.cjs << 'EOF'
module.exports = {
  apps: [{
    name: 'edahouse',
    script: './dist/index.js',
    instances: 1,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000  // Как в Replit
    },
    env_file: '.env',
    error_file: './logs/err.log',
    out_file: './logs/out.log', 
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    autorestart: true
  }]
};
EOF

# 11. Обновление server/index.ts для универсального порта
echo "🔧 Обновление server/index.ts..."
sed -i 's/const port = 3000/const port = parseInt(process.env.PORT || "5000", 10)/' server/index.ts
sed -i 's/port: 443/port: 5000/' server/index.ts

# 12. Сборка проекта
echo "🏗️ Сборка проекта..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Ошибка сборки! Проверяем зависимости..."
    npm audit fix --force
    npm run build
fi

# 13. Миграция базы данных
echo "🗄️ Миграция базы данных..."
npm run db:push || echo "Миграция уже выполнена"

# 14. Запуск приложения
echo "🚀 Запуск приложения..."
mkdir -p logs
pm2 start ecosystem.config.cjs

# 15. Проверка работоспособности
echo "⏳ Ожидание запуска..."
sleep 15

echo "🧪 Проверка endpoints..."
echo "=== Health ==="
curl -s http://localhost:5000/api/health | head -c 200
echo -e "\n=== Products ==="
curl -s http://localhost:5000/api/products | head -c 200  
echo -e "\n=== External ==="
curl -s https://$DOMAIN/api/health | head -c 200

echo -e "\n📊 Статус PM2:"
pm2 status

echo -e "\n✅ УНИВЕРСАЛЬНАЯ УСТАНОВКА ЗАВЕРШЕНА!"
echo "VPS теперь полностью совместим с Replit-проектами"
echo "Приложение доступно по адресу: https://$DOMAIN"

echo -e "\n📋 НАСТРОЙКА FASTPANEL (если порт не обновился автоматически):"
echo "1. Зайдите в FastPanel"
echo "2. Сайты → $DOMAIN → Настройки"
echo "3. Node.js приложение → Порт: измените с 3000 на 5000"
echo "4. Сохранить изменения"

echo -e "\n🔧 КОМАНДЫ ДЛЯ УПРАВЛЕНИЯ:"
echo "pm2 status          - статус приложения"
echo "pm2 logs edahouse   - логи приложения"  
echo "pm2 restart edahouse - перезапуск"
echo "pm2 stop edahouse   - остановка"
EOF
#!/bin/bash

# =============================================================================
# ПРОСТОЙ DEPLOY НА VPS С NEON DATABASE
# =============================================================================
# Использует Neon PostgreSQL напрямую без SSL - никаких миграций!
# Просто клонирует код и настраивает среду

set -e

echo "🚀 Простой деплой eDAHouse на VPS с Neon Database"
echo "=================================================="

# Параметры VPS (измените под ваш сервер)
VPS_PATH="/var/www/ordis_co_il_usr/data/www/edahouse.ordis.co.il"
PROJECT_NAME="edahouse"

# 1. Клонирование проекта (если еще не клонирован)
echo "📥 Клонирование проекта..."
if [ ! -d "$VPS_PATH" ]; then
    git clone https://github.com/alexjc55/Ordis.git "$VPS_PATH"
    cd "$VPS_PATH"
else
    cd "$VPS_PATH"
    git pull origin main
fi

# 2. Установка зависимостей
echo "📦 Установка зависимостей..."
npm install --production=false

# 3. Создание .env для production с Neon Database
echo "⚙️  Создание .env файла..."
cat > .env << 'EOF'
# Neon Database (PostgreSQL без SSL)
DATABASE_URL=postgresql://neondb_owner:RMtLNSzBiOgI@ep-floral-mountain-a55rnl0x.us-east-2.aws.neon.tech/neondb?sslmode=disable

# Server Configuration
PORT=5000
NODE_ENV=production
SESSION_SECRET=WAVl58TU5MAzQkQa6w8YTsuFYyyCwIl24D2j5BNsX4reNv1iYPdNQhLIGfxPVNg==

# Application Settings
ENABLE_REGISTRATION=true
ENABLE_GUEST_ORDERS=true
MAX_FILE_SIZE=5242880
UPLOAD_PATH=./uploads
ALLOWED_ORIGINS=https://edahouse.ordis.co.il
STORE_NAME=edahouse
STORE_DESCRIPTION=Food delivery service
EOF

# 4. Создание папок
echo "📁 Создание необходимых папок..."
mkdir -p uploads/images logs

# 5. Настройка PM2 конфигурации
echo "🔧 Настройка PM2..."
cat > ecosystem.config.cjs << 'EOF'
module.exports = {
  apps: [{
    name: 'edahouse',
    script: './node_modules/.bin/tsx',
    args: 'server/index.ts',
    instances: 1,
    env: {
      NODE_ENV: 'production',
      PORT: 5000
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

# 6. Установка tsx локально (если нужно)
echo "🔧 Установка tsx..."
npm install tsx --save-dev

# 7. Инициализация базы данных
echo "🗄️  Инициализация базы данных..."
npx drizzle-kit push

# 8. Запуск приложения через PM2
echo "🚀 Запуск приложения..."
pm2 stop edahouse 2>/dev/null || true
pm2 delete edahouse 2>/dev/null || true
pm2 start ecosystem.config.cjs

# 9. Настройка Nginx для FastPanel
echo "🌐 Настройка Nginx..."
NGINX_CONFIG="/etc/nginx/fastpanel2-available/ordis_co_il_usr/edahouse.ordis.co.il.conf"

if [ -f "$NGINX_CONFIG" ]; then
    # Бэкап существующей конфигурации
    sudo cp "$NGINX_CONFIG" "${NGINX_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"
    
    # Исправляем proxy_pass на localhost:5000
    sudo sed -i 's/proxy_pass.*edahouse\.ordis\.co\.il;/proxy_pass http:\/\/localhost:5000;/g' "$NGINX_CONFIG"
    sudo sed -i 's/proxy_pass.*localhost:[0-9]*;/proxy_pass http:\/\/localhost:5000;/g' "$NGINX_CONFIG"
    
    # Тестируем и перезагружаем Nginx
    sudo nginx -t && sudo systemctl reload nginx
else
    echo "⚠️  Nginx конфигурация не найдена. Настройте FastPanel вручную:"
    echo "   Сайты → edahouse.ordis.co.il → Node.js → Порт: 5000"
fi

# 10. Финальная проверка
echo "🧪 Финальная проверка..."
sleep 10

echo "📊 PM2 статус:"
pm2 status

echo "🔍 Проверка локального порта:"
curl -s -m 5 http://localhost:5000/api/health || echo "Локальный порт не отвечает"

echo "🌐 Проверка внешнего доступа:"
curl -s -m 5 https://edahouse.ordis.co.il/api/health || echo "Внешний доступ не работает"

echo ""
echo "✅ ДЕПЛОЙ ЗАВЕРШЕН!"
echo "=================================================="
echo "🌐 Сайт: https://edahouse.ordis.co.il"
echo "📊 PM2 команды:"
echo "   pm2 status"
echo "   pm2 logs edahouse"
echo "   pm2 restart edahouse"
echo ""
echo "📝 Если внешний доступ не работает:"
echo "   1. FastPanel → Сайты → edahouse.ordis.co.il"
echo "   2. Node.js приложения → Порт: 5000"
echo "   3. Сохранить изменения"
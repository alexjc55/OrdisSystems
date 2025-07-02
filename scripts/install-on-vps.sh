#!/bin/bash

# Скрипт автоматической установки eDAHouse на VPS
# Поддерживает установку нескольких инстансов на одном сервере

set -e

# Параметры (можно изменить)
PROJECT_NAME="${1:-edahouse}"
DOMAIN="${2:-edahouse.ordi.co.il}"
PORT="${3:-3000}"
DB_NAME="${PROJECT_NAME}_db"
DB_USER="${PROJECT_NAME}_user"

echo "🚀 Установка проекта $PROJECT_NAME"
echo "🌐 Домен: $DOMAIN"
echo "🔌 Порт: $PORT"
echo "🗄️ База данных: $DB_NAME"

# Проверяем права sudo
if [[ $EUID -eq 0 ]]; then
   echo "❌ Не запускайте скрипт от имени root. Используйте обычного пользователя с sudo."
   exit 1
fi

echo "📦 Обновляем систему и устанавливаем зависимости..."
sudo apt update && sudo apt upgrade -y

# Установка Node.js 18+
if ! command -v node &> /dev/null; then
    echo "📥 Устанавливаем Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Установка PM2
if ! command -v pm2 &> /dev/null; then
    echo "📥 Устанавливаем PM2..."
    sudo npm install -g pm2
fi

# Установка PostgreSQL
if ! command -v psql &> /dev/null; then
    echo "📥 Устанавливаем PostgreSQL..."
    sudo apt install postgresql postgresql-contrib -y
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
fi

# Установка Nginx
if ! command -v nginx &> /dev/null; then
    echo "📥 Устанавливаем Nginx..."
    sudo apt install nginx -y
    sudo systemctl start nginx
    sudo systemctl enable nginx
fi

# Установка Git
if ! command -v git &> /dev/null; then
    echo "📥 Устанавливаем Git..."
    sudo apt install git -y
fi

# Установка Certbot для SSL
if ! command -v certbot &> /dev/null; then
    echo "📥 Устанавливаем Certbot..."
    sudo apt install certbot python3-certbot-nginx -y
fi

echo "🗄️ Настраиваем PostgreSQL..."

# Генерируем случайный пароль
DB_PASSWORD=$(openssl rand -base64 32)

# Создаем базу данных и пользователя
sudo -u postgres psql <<EOF
CREATE DATABASE $DB_NAME;
CREATE USER $DB_USER WITH ENCRYPTED PASSWORD '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
ALTER USER $DB_USER CREATEDB;
\q
EOF

echo "✅ База данных $DB_NAME создана"

# Создаем директорию проекта
PROJECT_DIR="/var/www/$PROJECT_NAME"
sudo mkdir -p "$PROJECT_DIR"
sudo chown -R $USER:$USER "$PROJECT_DIR"

echo "📁 Клонируем проект в $PROJECT_DIR..."
cd "$PROJECT_DIR"

# Если это не Git репозиторий, инициализируем
if [ ! -d ".git" ]; then
    git init
    echo "⚠️ Инициализирован пустой Git репозиторий. Добавьте remote origin:"
    echo "git remote add origin https://github.com/your-username/edahouse.git"
    echo "git pull origin main"
fi

echo "⚙️ Создаем файл конфигурации..."

# Генерируем секретный ключ сессии
SESSION_SECRET=$(openssl rand -base64 64)

# Создаем .env файл
cat > .env <<EOF
# Database Configuration
DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME

# PostgreSQL Configuration
PGHOST=localhost
PGPORT=5432
PGDATABASE=$DB_NAME
PGUSER=$DB_USER
PGPASSWORD=$DB_PASSWORD

# Session Configuration
SESSION_SECRET=$SESSION_SECRET

# Server Configuration
PORT=$PORT
NODE_ENV=production

# Store Configuration
STORE_NAME=$PROJECT_NAME
STORE_DESCRIPTION=Food delivery service

# Features
ENABLE_REGISTRATION=true
ENABLE_GUEST_ORDERS=true

# File Upload
MAX_FILE_SIZE=5242880
UPLOAD_PATH=./uploads

# Security
ALLOWED_ORIGINS=https://$DOMAIN
EOF

echo "✅ Файл .env создан"

# Создаем директории
mkdir -p uploads/images logs backups

echo "📦 Устанавливаем зависимости..."
npm install

echo "🏗️ Собираем проект..."
npm run build

echo "🗄️ Настраиваем базу данных..."
npm run db:push

echo "🚀 Настраиваем PM2..."

# Создаем конфигурацию PM2 для этого инстанса
cat > ecosystem.${PROJECT_NAME}.config.js <<EOF
module.exports = {
  apps: [
    {
      name: '$PROJECT_NAME',
      script: './dist/index.js',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: $PORT,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: $PORT,
      },
      max_memory_restart: '1G',
      autorestart: true,
      watch: false,
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      kill_timeout: 5000,
      listen_timeout: 3000,
      min_uptime: '10s',
      max_restarts: 10,
    }
  ]
};
EOF

# Запускаем приложение
pm2 start ecosystem.${PROJECT_NAME}.config.js
pm2 save

echo "🌐 Настраиваем Nginx..."

# Создаем конфигурацию Nginx
sudo tee /etc/nginx/sites-available/$DOMAIN <<EOF
server {
    listen 80;
    server_name $DOMAIN;
    
    location / {
        proxy_pass http://localhost:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    location /uploads/ {
        alias $PROJECT_DIR/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    client_max_body_size 50M;
}
EOF

# Активируем сайт
sudo ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

echo "🔒 Получаем SSL сертификат..."
sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN

echo "🔧 Создаем скрипт обновления..."
cp scripts/update-project.sh update-${PROJECT_NAME}.sh
chmod +x update-${PROJECT_NAME}.sh

# Настраиваем переменные для скрипта обновления
sed -i "s|PROJECT_DIR=\"/var/www/edahouse\"|PROJECT_DIR=\"$PROJECT_DIR\"|g" update-${PROJECT_NAME}.sh
sed -i "s|pm2 reload edahouse|pm2 reload $PROJECT_NAME|g" update-${PROJECT_NAME}.sh
sed -i "s|pm2 describe edahouse|pm2 describe $PROJECT_NAME|g" update-${PROJECT_NAME}.sh
sed -i "s|pm2 logs edahouse|pm2 logs $PROJECT_NAME|g" update-${PROJECT_NAME}.sh
sed -i "s|pm2 status edahouse|pm2 status $PROJECT_NAME|g" update-${PROJECT_NAME}.sh

echo "📄 Сохраняем информацию об установке..."
cat > INSTALLATION_INFO.txt <<EOF
=== ИНФОРМАЦИЯ ОБ УСТАНОВКЕ ===
Проект: $PROJECT_NAME
Домен: $DOMAIN
Порт: $PORT
Директория: $PROJECT_DIR

База данных:
- Имя: $DB_NAME
- Пользователь: $DB_USER
- Пароль: $DB_PASSWORD

PM2 приложение: $PROJECT_NAME
Nginx конфигурация: /etc/nginx/sites-available/$DOMAIN

Команды управления:
- Статус: pm2 status $PROJECT_NAME
- Логи: pm2 logs $PROJECT_NAME
- Перезапуск: pm2 restart $PROJECT_NAME
- Обновление: ./update-${PROJECT_NAME}.sh

Установка завершена: $(date)
EOF

echo ""
echo "🎉 Установка завершена успешно!"
echo ""
echo "📋 Информация о проекте:"
echo "   Проект: $PROJECT_NAME"
echo "   URL: https://$DOMAIN"
echo "   Директория: $PROJECT_DIR"
echo ""
echo "🔧 Управление проектом:"
echo "   Статус: pm2 status $PROJECT_NAME"
echo "   Логи: pm2 logs $PROJECT_NAME"
echo "   Обновление: cd $PROJECT_DIR && ./update-${PROJECT_NAME}.sh"
echo ""
echo "📄 Детали установки сохранены в: $PROJECT_DIR/INSTALLATION_INFO.txt"
echo ""
echo "⚠️ ВАЖНО: Сохраните пароль базы данных: $DB_PASSWORD"
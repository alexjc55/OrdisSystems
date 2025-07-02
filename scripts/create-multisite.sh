#!/bin/bash

# Скрипт для создания нескольких инстансов eDAHouse на одном VPS
# Каждый инстанс имеет свою базу данных и порт

set -e

# Конфигурация инстансов
declare -A SITES=(
    ["edahouse"]="edahouse.ordi.co.il:3000"
    ["pizzahouse"]="pizzahouse.ordi.co.il:3001"
    ["sushihouse"]="sushihouse.ordi.co.il:3002"
)

BASE_DIR="/var/www"
REPO_URL="https://github.com/your-username/edahouse.git"

echo "🏗️ Создание мультисайт конфигурации eDAHouse"
echo "📊 Планируется создать ${#SITES[@]} инстансов:"

for site in "${!SITES[@]}"; do
    IFS=':' read -r domain port <<< "${SITES[$site]}"
    echo "   - $site: $domain (порт $port)"
done

read -p "Продолжить? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

# Проверяем базовые зависимости
echo "🔍 Проверяем системные зависимости..."
for cmd in node npm pm2 psql nginx git; do
    if ! command -v $cmd &> /dev/null; then
        echo "❌ $cmd не установлен. Запустите сначала scripts/install-on-vps.sh"
        exit 1
    fi
done

echo "✅ Все зависимости установлены"

# Создаем инстансы
for site in "${!SITES[@]}"; do
    IFS=':' read -r domain port <<< "${SITES[$site]}"
    
    echo ""
    echo "🚀 Создаем инстанс: $site"
    echo "   Домен: $domain"
    echo "   Порт: $port"
    
    SITE_DIR="$BASE_DIR/$site"
    DB_NAME="${site}_db"
    DB_USER="${site}_user"
    DB_PASSWORD=$(openssl rand -base64 32)
    
    # Создаем директорию
    sudo mkdir -p "$SITE_DIR"
    sudo chown -R $USER:$USER "$SITE_DIR"
    
    # Клонируем репозиторий
    echo "📥 Клонируем проект..."
    git clone "$REPO_URL" "$SITE_DIR"
    cd "$SITE_DIR"
    
    # Создаем базу данных
    echo "🗄️ Создаем базу данных $DB_NAME..."
    sudo -u postgres psql <<EOF
CREATE DATABASE $DB_NAME;
CREATE USER $DB_USER WITH ENCRYPTED PASSWORD '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
ALTER USER $DB_USER CREATEDB;
\q
EOF
    
    # Создаем .env файл
    echo "⚙️ Настраиваем конфигурацию..."
    SESSION_SECRET=$(openssl rand -base64 64)
    
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
PORT=$port
NODE_ENV=production

# Store Configuration
STORE_NAME=$site
STORE_DESCRIPTION=Food delivery service - $site

# Features
ENABLE_REGISTRATION=true
ENABLE_GUEST_ORDERS=true

# File Upload
MAX_FILE_SIZE=5242880
UPLOAD_PATH=./uploads

# Security
ALLOWED_ORIGINS=https://$domain
EOF
    
    # Создаем директории
    mkdir -p uploads/images logs backups
    
    # Устанавливаем зависимости и собираем
    echo "📦 Устанавливаем зависимости..."
    npm install
    
    echo "🏗️ Собираем проект..."
    npm run build
    
    echo "🗄️ Инициализируем базу данных..."
    npm run db:push
    
    # Создаем PM2 конфигурацию
    echo "🚀 Настраиваем PM2..."
    cat > ecosystem.config.js <<EOF
module.exports = {
  apps: [
    {
      name: '$site',
      script: './dist/index.js',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: $port,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: $port,
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
    pm2 start ecosystem.config.js
    
    # Создаем Nginx конфигурацию
    echo "🌐 Настраиваем Nginx для $domain..."
    sudo tee /etc/nginx/sites-available/$domain <<EOF
server {
    listen 80;
    server_name $domain;
    
    location / {
        proxy_pass http://localhost:$port;
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
        alias $SITE_DIR/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    client_max_body_size 50M;
}
EOF
    
    # Активируем сайт
    sudo ln -sf /etc/nginx/sites-available/$domain /etc/nginx/sites-enabled/
    
    # Создаем скрипт обновления для этого инстанса
    echo "🔧 Создаем скрипт обновления..."
    cp scripts/update-project.sh update-${site}.sh
    chmod +x update-${site}.sh
    
    # Настраиваем переменные
    sed -i "s|PROJECT_DIR=\"/var/www/edahouse\"|PROJECT_DIR=\"$SITE_DIR\"|g" update-${site}.sh
    sed -i "s|pm2 reload edahouse|pm2 reload $site|g" update-${site}.sh
    sed -i "s|pm2 describe edahouse|pm2 describe $site|g" update-${site}.sh
    sed -i "s|pm2 logs edahouse|pm2 logs $site|g" update-${site}.sh
    sed -i "s|pm2 status edahouse|pm2 status $site|g" update-${site}.sh
    
    # Сохраняем информацию об инстансе
    cat > INSTALLATION_INFO.txt <<EOF
=== ИНФОРМАЦИЯ ОБ ИНСТАНСЕ ===
Проект: $site
Домен: $domain
Порт: $port
Директория: $SITE_DIR

База данных:
- Имя: $DB_NAME
- Пользователь: $DB_USER
- Пароль: $DB_PASSWORD

PM2 приложение: $site
Nginx конфигурация: /etc/nginx/sites-available/$domain

Команды управления:
- Статус: pm2 status $site
- Логи: pm2 logs $site
- Перезапуск: pm2 restart $site
- Обновление: cd $SITE_DIR && ./update-${site}.sh

Создан: $(date)
EOF
    
    echo "✅ Инстанс $site создан успешно"
done

# Тестируем Nginx конфигурацию
echo ""
echo "🔍 Проверяем конфигурацию Nginx..."
sudo nginx -t

echo "🔄 Перезагружаем Nginx..."
sudo systemctl reload nginx

# Сохраняем PM2 конфигурацию
echo "💾 Сохраняем конфигурацию PM2..."
pm2 save

# Получаем SSL сертификаты
echo ""
echo "🔒 Получаем SSL сертификаты..."
for site in "${!SITES[@]}"; do
    IFS=':' read -r domain port <<< "${SITES[$site]}"
    echo "Получаем сертификат для $domain..."
    sudo certbot --nginx -d $domain --non-interactive --agree-tos --email admin@$domain || echo "⚠️ Не удалось получить сертификат для $domain"
done

# Создаем общий скрипт управления
echo "🔧 Создаем общий скрипт управления..."
cat > /tmp/manage-sites.sh <<'EOF'
#!/bin/bash

SITES=(edahouse pizzahouse sushihouse)

case "$1" in
    status)
        echo "📊 Статус всех сайтов:"
        pm2 status
        ;;
    logs)
        site="${2:-all}"
        if [ "$site" = "all" ]; then
            echo "📋 Логи всех сайтов:"
            pm2 logs
        else
            echo "📋 Логи сайта $site:"
            pm2 logs "$site"
        fi
        ;;
    restart)
        site="${2:-all}"
        if [ "$site" = "all" ]; then
            echo "🔄 Перезапускаем все сайты:"
            for s in "${SITES[@]}"; do
                pm2 restart "$s"
            done
        else
            echo "🔄 Перезапускаем сайт $site:"
            pm2 restart "$site"
        fi
        ;;
    update)
        site="${2:-all}"
        if [ "$site" = "all" ]; then
            echo "🔄 Обновляем все сайты:"
            for s in "${SITES[@]}"; do
                echo "Обновляем $s..."
                cd "/var/www/$s" && "./update-${s}.sh"
            done
        else
            echo "🔄 Обновляем сайт $site:"
            cd "/var/www/$site" && "./update-${site}.sh"
        fi
        ;;
    *)
        echo "Использование: $0 {status|logs|restart|update} [site_name]"
        echo ""
        echo "Команды:"
        echo "  status          - показать статус всех сайтов"
        echo "  logs [site]     - показать логи (всех или конкретного сайта)"
        echo "  restart [site]  - перезапустить (все или конкретный сайт)"
        echo "  update [site]   - обновить (все или конкретный сайт)"
        echo ""
        echo "Доступные сайты: ${SITES[*]}"
        exit 1
        ;;
esac
EOF

sudo mv /tmp/manage-sites.sh /usr/local/bin/manage-sites
sudo chmod +x /usr/local/bin/manage-sites

echo ""
echo "🎉 Мультисайт конфигурация создана успешно!"
echo ""
echo "📋 Созданные инстансы:"
for site in "${!SITES[@]}"; do
    IFS=':' read -r domain port <<< "${SITES[$site]}"
    echo "   - $site: https://$domain (порт $port)"
done
echo ""
echo "🔧 Управление сайтами:"
echo "   manage-sites status           - статус всех сайтов"
echo "   manage-sites logs [site]      - логи сайта"
echo "   manage-sites restart [site]   - перезапуск сайта"
echo "   manage-sites update [site]    - обновление сайта"
echo ""
echo "📄 Информация о каждом инстансе сохранена в соответствующих директориях"
# Чистое развертывание eDAHouse на новом сервере

## Почему нужно переустановить

Текущие проблемы:
- Конфликт между development и production сборкой
- Неправильная структура папок FastPanel
- Проблемы с путями в коде (import.meta.dirname)
- Смешанные настройки портов и окружения

## Рекомендуемый план действий

### Вариант 1: Обычный VPS (рекомендуется)

**Преимущества:**
- Полный контроль над сервером
- Стандартная структура папок `/var/www/`
- Простая настройка Nginx + PM2
- Без проблем FastPanel

**Требования:**
- Ubuntu 20.04/22.04 сервер
- 2GB RAM, 20GB SSD
- Sudo доступ

### Вариант 2: Исправление текущего FastPanel

**Если хотите остаться на FastPanel:**
- Полная очистка текущей установки
- Исправление кода под структуру FastPanel
- Настройка через файловый менеджер

## План для обычного VPS (рекомендуется)

### 1. Базовая настройка сервера

```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка базовых пакетов
sudo apt install -y curl wget git nano htop

# Установка Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Установка PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Установка Nginx
sudo apt install -y nginx

# Установка PM2
sudo npm install -g pm2

# Установка Certbot для SSL
sudo apt install -y certbot python3-certbot-nginx
```

### 2. Настройка PostgreSQL

```bash
# Переключение на пользователя postgres
sudo -u postgres psql

-- В psql:
CREATE DATABASE edahouse_ord;
CREATE USER edahouse_ord WITH PASSWORD '33V0R1N5qi81paiA';
GRANT ALL PRIVILEGES ON DATABASE edahouse_ord TO edahouse_ord;
\q
```

### 3. Настройка проекта

```bash
# Создание папки проекта
sudo mkdir -p /var/www/edahouse.ordis.co.il
sudo chown $USER:$USER /var/www/edahouse.ordis.co.il

# Клонирование проекта
cd /var/www/edahouse.ordis.co.il
git clone https://github.com/alexjc55/Ordis.git .

# Установка зависимостей
npm install

# Создание .env файла
cat > .env << 'EOF'
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

DATABASE_URL=postgresql://edahouse_ord:33V0R1N5qi81paiA@localhost:5432/edahouse_ord
PGHOST=localhost
PGPORT=5432
PGDATABASE=edahouse_ord
PGUSER=edahouse_ord
PGPASSWORD=33V0R1N5qi81paiA

SESSION_SECRET=WAVl58TU5MAzQkQa6w8YTsuFYyyCwIl24D2j5BNsX4reNv1iYPdNQHtog2Y0CYQ39U1HGYYG1cNQhLIGfxPVNg==

ENABLE_REGISTRATION=true
ENABLE_GUEST_ORDERS=true
MAX_FILE_SIZE=5242880
UPLOAD_PATH=./uploads
ALLOWED_ORIGINS=https://edahouse.ordis.co.il
STORE_NAME=edahouse
STORE_DESCRIPTION=Food delivery service
EOF

# Создание папок
mkdir -p uploads/images logs backups

# Сборка проекта
npm run build

# Настройка базы данных
npm run db:push
```

### 4. Настройка PM2

```bash
# Создание ecosystem.config.js
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'edahouse',
    script: 'dist/index.js',
    cwd: '/var/www/edahouse.ordis.co.il',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
EOF

# Запуск через PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 5. Настройка Nginx

```bash
# Создание конфигурации Nginx
sudo tee /etc/nginx/sites-available/edahouse.ordis.co.il << 'EOF'
upstream edahouse {
    server 127.0.0.1:3000;
}

server {
    server_name edahouse.ordis.co.il;
    
    location / {
        proxy_pass http://edahouse;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    location /uploads/ {
        alias /var/www/edahouse.ordis.co.il/uploads/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    listen 80;
}
EOF

# Активация сайта
sudo ln -s /etc/nginx/sites-available/edahouse.ordis.co.il /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 6. Получение SSL сертификата

```bash
# Получение Let's Encrypt SSL
sudo certbot --nginx -d edahouse.ordis.co.il

# Автообновление сертификатов
sudo crontab -e
# Добавить строку:
# 0 12 * * * /usr/bin/certbot renew --quiet
```

### 7. Проверка работы

```bash
# Проверка статуса сервисов
pm2 status
sudo systemctl status nginx
sudo systemctl status postgresql

# Проверка подключения
curl http://localhost:3000/api/health
curl https://edahouse.ordis.co.il/api/health

# Просмотр логов
pm2 logs edahouse
tail -f /var/log/nginx/error.log
```

## Время установки

- **Подготовка сервера**: 15 минут
- **Установка проекта**: 10 минут
- **Настройка сервисов**: 15 минут
- **SSL сертификат**: 5 минут
- **Итого**: ~45 минут

## Автоматический скрипт установки

```bash
#!/bin/bash
# Скачать и запустить:
curl -sSL https://raw.githubusercontent.com/alexjc55/Ordis/main/scripts/install.sh | bash
```

## Мониторинг и обслуживание

```bash
# Обновление проекта
cd /var/www/edahouse.ordis.co.il
git pull origin main
npm install
npm run build
pm2 restart edahouse

# Резервное копирование
pg_dump -U edahouse_ord -h localhost edahouse_ord > backup_$(date +%Y%m%d).sql
tar -czf uploads_backup_$(date +%Y%m%d).tar.gz uploads/

# Мониторинг ресурсов
htop
pm2 monit
tail -f logs/combined.log
```

## Заключение

Чистая установка на обычном VPS займет менее часа и даст стабильно работающий проект без проблем с путями, портами и конфигурацией. FastPanel добавляет лишние сложности для такого проекта.
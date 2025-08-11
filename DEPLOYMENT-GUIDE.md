# Руководство по развертыванию eDAHouse на VPS

## Подготовка сервера

### 1. Установка зависимостей на сервере
```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Установка PM2 для управления процессами
sudo npm install -g pm2

# Установка PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Установка Nginx
sudo apt install nginx -y

# Установка Git (если не установлен)
sudo apt install git -y
```

### 2. Настройка PostgreSQL
```bash
# Войти в PostgreSQL как пользователь postgres
sudo -u postgres psql

# Создать базу данных и пользователя
CREATE DATABASE edahouse;
CREATE USER edahouse_user WITH ENCRYPTED PASSWORD 'your_secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE edahouse TO edahouse_user;
\q
```

### 3. Клонирование и настройка проекта
```bash
# Перейти в директорию проектов
cd /var/www

# Клонировать проект (замените на ваш репозиторий)
sudo git clone https://github.com/your-username/edahouse.git
sudo chown -R $USER:$USER edahouse
cd edahouse

# Установить зависимости
npm install

# Создать файл окружения
cp .env.example .env
```

### 4. Настройка переменных окружения (.env)
```bash
# Отредактировать файл .env
nano .env
```

Содержимое файла .env:
```
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://edahouse_user:your_secure_password_here@localhost:5432/edahouse

# Секретный ключ для сессий (сгенерируйте случайную строку)
SESSION_SECRET=your_very_long_random_session_secret_here_minimum_32_characters

# Настройки PostgreSQL
PGHOST=localhost
PGPORT=5432
PGDATABASE=edahouse
PGUSER=edahouse_user
PGPASSWORD=your_secure_password_here
```

### 5. Сборка и запуск проекта
```bash
# Сборка фронтенда
npm run build

# Настройка базы данных
npm run db:push

# Запуск с помощью PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## Настройка Nginx

### 1. Создание конфигурации Nginx
```bash
sudo nano /etc/nginx/sites-available/edahouse.ordi.co.il
```

### 2. Конфигурация для поддомена edahouse.ordi.co.il
```nginx
server {
    listen 80;
    server_name edahouse.ordi.co.il;

    # Перенаправление HTTP на HTTPS (после настройки SSL)
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name edahouse.ordi.co.il;

    # SSL сертификаты (настроить после получения Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/edahouse.ordi.co.il/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/edahouse.ordi.co.il/privkey.pem;

    # Настройки SSL
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers on;

    # Основная конфигурация
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Статические файлы
    location /uploads/ {
        alias /var/www/edahouse/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Настройки для больших файлов
    client_max_body_size 50M;
}
```

### 3. Активация конфигурации
```bash
# Создать символическую ссылку
sudo ln -s /etc/nginx/sites-available/edahouse.ordi.co.il /etc/nginx/sites-enabled/

# Проверить конфигурацию
sudo nginx -t

# Перезапустить Nginx
sudo systemctl restart nginx
```

## Настройка SSL с Let's Encrypt

### 1. Установка Certbot
```bash
sudo apt install certbot python3-certbot-nginx -y
```

### 2. Получение SSL сертификата
```bash
sudo certbot --nginx -d edahouse.ordi.co.il
```

## Настройка DNS

В панели управления доменом ordi.co.il добавьте A-запись:
```
Тип: A
Имя: edahouse
Значение: IP_адрес_вашего_VPS
TTL: 300 (или по умолчанию)
```

## Файлы конфигурации PM2

Будет создан файл `ecosystem.config.js` для управления процессами.

## Обслуживание

### Команды PM2
```bash
# Просмотр статуса
pm2 status

# Просмотр логов
pm2 logs

# Перезапуск приложения
pm2 restart edahouse

# Остановка приложения
pm2 stop edahouse
```

### Обновление проекта
```bash
cd /var/www/edahouse
git pull origin main
npm install
npm run build
pm2 restart edahouse
```

## Проверка работы

После завершения настройки откройте в браузере:
- http://edahouse.ordi.co.il (должен перенаправлять на HTTPS)
- https://edahouse.ordi.co.il (основной сайт)

## Резервное копирование

Рекомендуется настроить автоматическое резервное копирование:
- База данных PostgreSQL
- Файлы проекта
- Загруженные изображения

## Мониторинг

- PM2 предоставляет встроенный мониторинг: `pm2 monit`
- Логи Nginx: `/var/log/nginx/access.log` и `/var/log/nginx/error.log`
- Логи приложения: `pm2 logs edahouse`
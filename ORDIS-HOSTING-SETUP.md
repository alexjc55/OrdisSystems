# Инструкция для хостинга Ordis.co.il

## Корневая папка: `/var/www/ordis_co_il_usr/data/www/edahouse.ordis.co.il`

### Готовая команда для установки

```bash
# Подключение к серверу
ssh your-username@your-server

# Установка проекта
curl -sSL https://raw.githubusercontent.com/YOUR_USERNAME/edahouse/main/scripts/install-on-vps.sh | bash -s edahouse edahouse.ordis.co.il 3000
```

### После установки

Проект будет установлен в:
```
/var/www/ordis_co_il_usr/data/www/edahouse.ordis.co.il/
```

### Команды управления

```bash
# Переход в папку проекта
cd /var/www/ordis_co_il_usr/data/www/edahouse.ordis.co.il

# Обновление проекта
./update-edahouse.sh

# Резервная копия
./scripts/backup.sh edahouse

# Проверка работоспособности
./scripts/health-check.sh edahouse edahouse.ordis.co.il 3000

# Статус PM2
pm2 status

# Логи приложения
pm2 logs edahouse

# Перезапуск
pm2 restart edahouse
```

### Nginx конфигурация

Будет создан файл: `/etc/nginx/sites-available/edahouse.ordis.co.il`

```nginx
server {
    listen 80;
    server_name edahouse.ordis.co.il;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name edahouse.ordis.co.il;

    root /var/www/ordis_co_il_usr/data/www/edahouse.ordis.co.il/dist;
    index index.html;

    # SSL certificates (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/edahouse.ordis.co.il/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/edahouse.ordis.co.il/privkey.pem;

    # API proxy
    location /api/ {
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

    # Static files
    location /uploads/ {
        alias /var/www/ordis_co_il_usr/data/www/edahouse.ordis.co.il/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Frontend routing
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### PM2 конфигурация

Файл: `/var/www/ordis_co_il_usr/data/www/edahouse.ordis.co.il/ecosystem.edahouse.config.cjs`

```javascript
module.exports = {
  apps: [{
    name: 'edahouse',
    script: './server/index.js',
    cwd: '/var/www/ordis_co_il_usr/data/www/edahouse.ordis.co.il',
    instances: 1,
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
}
```

### База данных

- **Название**: edahouse_db
- **Пользователь**: edahouse_user
- **Подключение**: через переменные окружения в .env

### SSL сертификат

Автоматически создается с помощью Let's Encrypt:
```bash
certbot --nginx -d edahouse.ordis.co.il
```

### Мониторинг

```bash
# Проверка здоровья API
curl https://edahouse.ordis.co.il/api/health

# Статус сервисов
systemctl status nginx
systemctl status postgresql

# Использование ресурсов
htop
df -h
```

### Logs

```bash
# Логи приложения
pm2 logs edahouse

# Логи Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Логи SSL
sudo tail -f /var/log/letsencrypt/letsencrypt.log
```

### Backup и восстановление

```bash
# Автоматический бэкап
cd /var/www/ordis_co_il_usr/data/www/edahouse.ordis.co.il
./scripts/backup.sh edahouse

# Настройка автоматического бэкапа (каждую ночь в 2:00)
echo "0 2 * * * cd /var/www/ordis_co_il_usr/data/www/edahouse.ordis.co.il && ./scripts/backup.sh edahouse" | crontab -
```

### Файловая структура после установки

```
/var/www/ordis_co_il_usr/data/www/edahouse.ordis.co.il/
├── client/                 # React фронтенд
├── server/                 # Express бэкенд
├── shared/                 # Общие типы
├── uploads/                # Загруженные файлы
├── dist/                   # Собранный фронтенд
├── logs/                   # Логи PM2
├── backups/                # Резервные копии
├── scripts/                # Служебные скрипты
├── .env                    # Переменные окружения
├── ecosystem.config.js     # Конфигурация PM2
├── update-edahouse.sh      # Скрипт обновления
└── package.json            # Зависимости
```

**Проект готов к установке на хостинг Ordis.co.il с корневой папкой `/var/www/ordis_co_il_usr/data/www/edahouse.ordis.co.il`**
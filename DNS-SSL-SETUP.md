# Настройка DNS и SSL для edahouse.ordi.co.il

## Шаг 1: Настройка DNS записи

### В панели управления доменом ordi.co.il:

1. Найдите раздел "DNS Management" или "DNS Records"
2. Добавьте новую A-запись:
   ```
   Тип записи: A
   Имя (Name/Host): edahouse
   Значение (Value/Points to): [IP адрес вашего VPS]
   TTL: 300 (или оставьте по умолчанию)
   ```

3. Сохраните изменения
4. Подождите 5-15 минут для распространения DNS

### Проверка DNS:
```bash
# На вашем компьютере проверьте:
nslookup edahouse.ordi.co.il

# Должен показать IP адрес вашего VPS
```

## Шаг 2: Временная конфигурация Nginx (без SSL)

Создайте временную конфигурацию для получения SSL сертификата:

```bash
sudo nano /etc/nginx/sites-available/edahouse.ordi.co.il
```

Вставьте временную конфигурацию:
```nginx
server {
    listen 80;
    server_name edahouse.ordi.co.il;

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

    client_max_body_size 50M;
}
```

Активируйте конфигурацию:
```bash
sudo ln -s /etc/nginx/sites-available/edahouse.ordi.co.il /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Шаг 3: Получение SSL сертификата

### Установка Certbot:
```bash
sudo apt update
sudo apt install certbot python3-certbot-nginx -y
```

### Получение сертификата:
```bash
sudo certbot --nginx -d edahouse.ordi.co.il
```

Certbot автоматически:
- Получит SSL сертификат от Let's Encrypt
- Обновит конфигурацию Nginx для HTTPS
- Настроит автоматическое перенаправление с HTTP на HTTPS

### Проверка автообновления сертификатов:
```bash
sudo certbot renew --dry-run
```

## Шаг 4: Финальная конфигурация Nginx

После получения SSL сертификата конфигурация будет выглядеть так:

```nginx
server {
    listen 80;
    server_name edahouse.ordi.co.il;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name edahouse.ordi.co.il;

    ssl_certificate /etc/letsencrypt/live/edahouse.ordi.co.il/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/edahouse.ordi.co.il/privkey.pem;
    
    # Добавляем заголовки безопасности
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers on;
    
    # HSTS заголовок
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
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

    location /uploads/ {
        alias /var/www/edahouse/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    client_max_body_size 50M;
}
```

## Шаг 5: Проверка работы

1. Откройте браузер и перейдите на http://edahouse.ordi.co.il
2. Убедитесь, что происходит автоматическое перенаправление на https://
3. Проверьте, что сайт загружается без ошибок SSL
4. Убедитесь, что изображения и статические файлы загружаются корректно

## Troubleshooting

### Если DNS не работает:
```bash
# Проверка на сервере
dig edahouse.ordi.co.il

# Проверка с разных DNS серверов
nslookup edahouse.ordi.co.il 8.8.8.8
```

### Если SSL не работает:
```bash
# Проверка статуса сертификата
sudo certbot certificates

# Принудительное обновление
sudo certbot renew --force-renewal -d edahouse.ordi.co.il
```

### Проверка логов:
```bash
# Логи Nginx
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# Логи приложения
pm2 logs edahouse
```

## Мониторинг SSL

Настройте автоматическое обновление сертификатов:
```bash
# Добавить в crontab
sudo crontab -e

# Добавить строку для проверки каждый день в 2:30
30 2 * * * /usr/bin/certbot renew --quiet --nginx
```
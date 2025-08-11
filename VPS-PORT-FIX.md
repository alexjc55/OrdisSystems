# Исправление проблемы с портом на VPS

## Проблема
Приложение запускается на порту 3001 вместо 3000, что означает, что порт 3000 занят.

## Решение на VPS

### 1. Проверить, что занимает порт 3000
```bash
sudo netstat -tlnp | grep :3000
sudo lsof -i :3000
```

### 2. Остановить процесс, занимающий порт 3000
```bash
# Если это другой процесс - остановить его
sudo kill -9 [PID_процесса]

# Если это старый PM2 процесс
pm2 stop all
pm2 delete all
```

### 3. Перезапустить приложение
```bash
cd ~/www/edahouse.ordis.co.il

# Убедиться что приложение остановлено
pm2 stop edahouse
pm2 delete edahouse

# Обновить код с исправлениями
git pull origin main

# Собрать приложение
npm run build

# Запустить на правильном порту
pm2 start ecosystem.config.cjs --env production

# Проверить статус
pm2 status
pm2 logs edahouse --lines 10
```

### 4. Проверить Nginx конфигурацию
```bash
sudo nano /etc/nginx/fastpanel2-available/ordis_co_il_usr/edahouse.ordis.co.il.conf
```

Убедиться что прокси настроен на порт 3000:
```nginx
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
```

### 5. Перезапустить Nginx
```bash
sudo nginx -t
sudo systemctl reload nginx
```

## Ожидаемый результат
- Приложение запускается на порту 3000
- Nginx корректно проксирует запросы
- Сайт доступен без проблем с портами
# 🚀 Настройка demo.ordis.co.il с SEO Middleware

## 📋 Быстрая настройка (5 минут)

### На VPS выполните эти команды:

```bash
# 1. Перейдите в директорию demo проекта
cd ~/www/demo.ordis.co.il  # Или путь где находится ваш demo

# 2. Скопируйте файлы из production проекта
# Вариант A: Если у вас есть доступ к обоим проектам на VPS
cp ~/www/edahouse.ordis.co.il/ecosystem.demo.config.cjs .
cp -r ~/www/edahouse.ordis.co.il/client . # Нужен для meta-injection

# Вариант B: Скопируйте с вашего компьютера через scp
# scp ecosystem.demo.config.cjs user@ordis.co.il:~/www/demo.ordis.co.il/
# scp -r client user@ordis.co.il:~/www/demo.ordis.co.il/

# 3. Проверьте что client/index.html существует
ls -la client/index.html
# Должен показать файл, это важно для middleware!

# 4. Остановите текущий PM2 процесс demo (если он запущен)
pm2 stop demo  # Или как называется ваш процесс
pm2 delete demo

# 5. Запустите с новой конфигурацией
pm2 start ecosystem.demo.config.cjs --env production

# 6. Сохраните конфигурацию
pm2 save

# 7. Проверьте статус
pm2 list
# Должно показать: edahouse-demo | online | fork | NODE_ENV=production

# 8. Проверьте NODE_ENV
pm2 env edahouse-demo | grep NODE_ENV
# Должно быть: NODE_ENV=production ✅
```

---

## 🔧 Настройка Nginx для demo

### Если Nginx ещё не настроен для demo.ordis.co.il:

```bash
# Создайте/отредактируйте конфигурацию Nginx
sudo nano /etc/nginx/sites-available/demo.ordis.co.il
```

Содержимое конфигурации:

```nginx
server {
    listen 80;
    server_name demo.ordis.co.il;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name demo.ordis.co.il;

    # SSL certificates (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/demo.ordis.co.il/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/demo.ordis.co.il/privkey.pem;

    # Логи
    access_log /var/log/nginx/demo.ordis.co.il.access.log;
    error_log /var/log/nginx/demo.ordis.co.il.error.log;

    # Проксирование к Node.js приложению на порту 5001
    location / {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # ВАЖНО: Передаём User-Agent и Accept для SEO middleware
        proxy_set_header User-Agent $http_user_agent;
        proxy_set_header Accept $http_accept;
    }

    # Статические файлы (если нужны)
    location /uploads/ {
        alias /path/to/demo/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

Активируйте конфигурацию:

```bash
# Создайте симлинк
sudo ln -sf /etc/nginx/sites-available/demo.ordis.co.il /etc/nginx/sites-enabled/

# Проверьте конфигурацию
sudo nginx -t

# Перезапустите Nginx
sudo systemctl reload nginx
```

---

## 🔍 Проверка что SEO работает

```bash
# На VPS выполните:
curl -A "Googlebot" -H "Accept: text/html" http://localhost:5001/ 2>/dev/null | grep '"@type"'

# Должны увидеть:
# "@type": "Restaurant"
# "@type": "ItemList"
# Значит всё работает! ✅

# Проверьте логи PM2
pm2 logs edahouse-demo --lines 10

# Должны увидеть:
# [SEO Bot] Detected: Googlebot
# [SEO Bot] Injected structured data: { restaurant: true, categories: X, products: 0 }
```

**ВАЖНО**: Флаг `-H "Accept: text/html"` обязателен! Middleware проверяет этот заголовок.

---

## 🌐 Тест в Google Rich Results

1. Откройте: https://search.google.com/test/rich-results
2. Введите: `https://demo.ordis.co.il/`
3. Должны увидеть:
   - Restaurant schema ✅
   - ItemList с категориями ✅

---

## 📝 Важные моменты

### 1. Два процесса PM2 на разных портах

После настройки у вас будет:
- **edahouse** (основной) → порт 3000 → https://edahouse.ordis.co.il
- **edahouse-demo** → порт 5001 → https://demo.ordis.co.il

```bash
# Проверьте оба процесса
pm2 list

# Должно показать:
# │ id │ name           │ mode  │ status │ port │
# ├────┼────────────────┼───────┼────────┼──────┤
# │ 1  │ edahouse       │ fork  │ online │ 3000 │
# │ 2  │ edahouse-demo  │ fork  │ online │ 5001 │
```

### 2. Оба используют одну базу данных

По умолчанию demo использует ту же БД что и production. Если нужны разные данные:

```bash
# Создайте отдельную БД для demo
sudo -u postgres createdb edahouse_demo

# Отредактируйте ecosystem.demo.config.cjs
nano ecosystem.demo.config.cjs

# Измените DATABASE_URL:
# DATABASE_URL: 'postgresql://user:password@localhost:5432/edahouse_demo'
```

### 3. Структура файлов на VPS

```
~/www/demo.ordis.co.il/
├── dist/                    # Скомпилированный код
│   ├── index.js            # Express сервер
│   └── assets/             # JS/CSS
├── client/                  # ОБЯЗАТЕЛЬНО для meta-injection!
│   └── index.html          # HTML шаблон для ботов
├── ecosystem.demo.config.cjs  # PM2 конфигурация
├── uploads/                 # Загруженные изображения
├── logs/                    # Логи PM2
│   ├── demo-err.log
│   └── demo-out.log
└── .env                     # Environment variables (если используете)
```

---

## 🐛 Troubleshooting

### Проблема: SEO middleware не работает

```bash
# 1. Проверьте NODE_ENV
pm2 env edahouse-demo | grep NODE_ENV
# Должно быть: NODE_ENV=production

# 2. Проверьте что client/index.html существует
ls -la ~/www/demo.ordis.co.il/client/index.html

# 3. Перезапустите с флагом
pm2 restart ecosystem.demo.config.cjs --env production --update-env

# 4. Проверьте логи на ошибки
pm2 logs edahouse-demo --err
```

### Проблема: Конфликт портов

```bash
# Проверьте что порт 5001 свободен
netstat -tulpn | grep 5001

# Если занят - измените PORT в ecosystem.demo.config.cjs
```

### Проблема: Nginx не проксирует запросы

```bash
# Проверьте логи Nginx
sudo tail -f /var/log/nginx/demo.ordis.co.il.error.log

# Проверьте что proxy_pass указывает на правильный порт (5001)
sudo nano /etc/nginx/sites-available/demo.ordis.co.il
```

---

## ✅ Готово!

Теперь оба сайта работают с SEO middleware:
- 🟢 https://edahouse.ordis.co.il/ (порт 3000)
- 🟢 https://demo.ordis.co.il/ (порт 5001)

Google увидит на обоих:
- Структурированные данные Restaurant
- Список категорий для sitelinks
- Правильные мета-теги

Это улучшит SEO обоих доменов! 🚀

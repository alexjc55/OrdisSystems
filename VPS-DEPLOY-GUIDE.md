# 🚀 VPS Deployment Guide for eDAHouse

## 📋 Quick Fix для SEO (Google Rich Results)

Проблема: Google не видит JSON-LD схемы потому что PM2 запущен без `NODE_ENV=production`.

### ✅ Решение (выполните на VPS):

```bash
# 1. Перейдите в директорию проекта
cd /var/www/edahouse

# 2. Скопируйте ecosystem.config.js из репозитория на VPS
# (используйте scp, git pull, или скопируйте содержимое вручную)

# 3. Остановите текущий PM2 процесс
pm2 stop edahouse
pm2 delete edahouse

# 4. Запустите с правильной конфигурацией
pm2 start ecosystem.config.js --env production

# 5. Сохраните конфигурацию для автозапуска
pm2 save

# 6. Проверьте что процесс запущен
pm2 list
pm2 env edahouse  # Должно показать NODE_ENV=production
```

### 🔍 Проверка что SEO работает:

```bash
# На вашем компьютере выполните:
curl -A "Googlebot" https://edahouse.ordis.co.il/ | grep -o '"@type":"Restaurant"'

# Должно вывести: "@type":"Restaurant"
# Если видите это - значит всё работает! ✅
```

### 🌐 Тест в Google Rich Results:

1. Откройте: https://search.google.com/test/rich-results
2. Введите: `https://edahouse.ordis.co.il/`
3. Должны увидеть:
   - Restaurant schema ✅
   - ItemList с категориями ✅
   - ItemList с продуктами ✅

---

## 📦 Полный процесс деплоя (для будущих обновлений)

### Вариант 1: Автоматический деплой (если настроен SSH)

```bash
# На локальном компьютере:
export VPS_HOST=edahouse.ordis.co.il
export VPS_USER=your_username

./scripts/deploy.sh
```

### Вариант 2: Ручной деплой

```bash
# На локальном компьютере:
node scripts/update-sw-version.js  # Обновить версию SW
npm run build                       # Собрать проект

# Скопировать на VPS:
scp -r dist/* user@edahouse.ordis.co.il:/var/www/edahouse/dist/
scp ecosystem.config.js user@edahouse.ordis.co.il:/var/www/edahouse/
scp -r client/* user@edahouse.ordis.co.il:/var/www/edahouse/client/

# На VPS:
cd /var/www/edahouse
pm2 restart ecosystem.config.js --env production --update-env
```

---

## 🔧 Структура файлов на VPS

```
/var/www/edahouse/
├── dist/                    # Скомпилированный код (npm run build)
│   ├── index.js            # Express сервер
│   └── assets/             # JS/CSS файлы с хэшами
├── client/                  # Нужен для meta-injection-middleware
│   └── index.html          # HTML шаблон для ботов
├── ecosystem.config.js      # PM2 конфигурация
├── uploads/                 # Загруженные изображения
└── .env                     # Environment variables
```

---

## ⚠️ Важные моменты

1. **NODE_ENV=production обязателен** для работы SEO middleware
2. **client/index.html должен существовать** на VPS для meta injection
3. **uploads/ директория** должна быть доступна для чтения
4. **DATABASE_URL** должен быть настроен в .env или PM2 config

---

## 🐛 Troubleshooting

### Проблема: Google всё ещё не видит схемы

```bash
# На VPS проверьте:
pm2 env edahouse | grep NODE_ENV
# Должно быть: NODE_ENV=production

# Проверьте логи:
pm2 logs edahouse

# Перезапустите с флагом:
pm2 restart ecosystem.config.js --env production --update-env
```

### Проблема: Белый экран после обновления

```bash
# Убедитесь что BUILD_TIMESTAMP обновлён перед деплоем:
node scripts/update-sw-version.js
npm run build
# затем деплой
```

### Проблема: 404 для /api/manifest или /api/favicon

```bash
# Убедитесь что Express запущен и слушает порт 5000
pm2 list
curl http://localhost:5000/api/manifest
```

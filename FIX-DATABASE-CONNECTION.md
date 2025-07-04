# ИСПРАВЛЕНИЕ ПОДКЛЮЧЕНИЯ К БАЗЕ ДАННЫХ НА VPS

## Проблема
Приложение пытается подключиться к внешней базе Neon Database (Replit) вместо локальной PostgreSQL на VPS, что вызывает ошибку `connect ECONNREFUSED ::1:443`.

## Быстрое исправление

### Команда 1: Скачать скрипт исправления
```bash
curl -o fix-database-connection.sh https://raw.githubusercontent.com/alexjc55/Ordis/main/deploy/fix-database-connection.sh
chmod +x fix-database-connection.sh
```

### Команда 2: Запустить исправление
```bash
./fix-database-connection.sh
```

## Что делает скрипт
1. ✅ Создает резервную копию текущего .env файла
2. ✅ Обновляет DATABASE_URL для использования локальной PostgreSQL
3. ✅ Исправляет PORT с 5000 на 3000 для VPS
4. ✅ Обновляет PM2 конфигурацию для загрузки переменных окружения
5. ✅ Тестирует подключение к базе данных
6. ✅ Перезапускает приложение с новой конфигурацией

## Ручное исправление (если скрипт недоступен)

### Шаг 1: Обновить .env файл
```bash
cp .env .env.backup
cat > .env << 'EOF'
DATABASE_URL=postgresql://edahouse_ord:33V0R1N5qi81paiA@localhost:5432/edahouse_ord
PORT=3000
NODE_ENV=production
SESSION_SECRET=WAVl58TU5MAzQkQa6w8YTsuFYyyCwIl24D2j5BNsX4reNv1iYPdNQHtog2Y0CYQ39U1HGYYG1cNQhLIGfxPVNg==
ENABLE_REGISTRATION=true
ENABLE_GUEST_ORDERS=true
MAX_FILE_SIZE=5242880
UPLOAD_PATH=./uploads
ALLOWED_ORIGINS=https://edahouse.ordis.co.il
STORE_NAME=edahouse
STORE_DESCRIPTION=Food delivery service
EOF
```

### Шаг 2: Обновить PM2 конфигурацию
```bash
cat > ecosystem.config.cjs << 'EOF'
module.exports = {
  apps: [{
    name: 'edahouse',
    script: './dist/index.js',
    instances: 1,
    env_file: '.env',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      DATABASE_URL: 'postgresql://edahouse_ord:33V0R1N5qi81paiA@localhost:5432/edahouse_ord'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
}
EOF
```

### Шаг 3: Перезапустить приложение
```bash
pm2 delete edahouse
pm2 start ecosystem.config.cjs
pm2 save
```

## Проверка результата
```bash
# Проверить статус приложения
pm2 status

# Проверить логи на ошибки
pm2 logs edahouse --lines 10

# Проверить сайт
curl https://edahouse.ordis.co.il/api/products
```

## Ожидаемый результат
- ✅ Нет ошибок подключения в логах
- ✅ API возвращает данные продуктов
- ✅ Сайт загружает товары из базы данных
- ✅ Админ панель работает корректно

---
**Дата создания:** 4 июля 2025  
**Статус:** Готово к использованию
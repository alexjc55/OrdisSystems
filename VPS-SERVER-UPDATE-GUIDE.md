# Руководство по обновлению VPS сервера

## Проблема
После миграции базы данных и обновления кода локально, удаленный VPS сервер перестал работать корректно из-за несоответствия между кодом и схемой базы данных.

## Решение: Поэтапное обновление VPS сервера

### 1. Подключение к VPS серверу
```bash
ssh ordis.co.il
cd /var/www/edahouse.ordis.co.il
```

### 2. Остановка приложения
```bash
pm2 stop edahouse
pm2 delete edahouse
```

### 3. Создание резервной копии
```bash
# Резервная копия кода
cp -r /var/www/edahouse.ordis.co.il /var/www/edahouse.ordis.co.il.backup.$(date +%Y%m%d_%H%M%S)

# Резервная копия базы данных
pg_dump -h localhost -U edahouse_usr -d edahouse > backup_before_update_$(date +%Y%m%d_%H%M%S).sql
```

### 4. Обновление кода с GitHub
```bash
# Получить последние изменения
git fetch origin main
git reset --hard origin/main

# Или если нужно принудительно перезаписать локальные изменения:
git pull origin main --force
```

### 5. Установка зависимостей (если изменились)
```bash
npm ci --production
```

### 6. Миграция базы данных (УЖЕ ВЫПОЛНЕНА)
База данных уже обновлена миграцией, которую вы запустили ранее.

### 7. Проверка переменных окружения
```bash
# Проверить что .env файл содержит правильные настройки
cat .env

# Убедиться что DATABASE_URL указывает на правильную базу:
# postgresql://edahouse_usr:password@localhost:5432/edahouse
```

### 8. Сборка приложения
```bash
npm run build
```

### 9. Запуск приложения
```bash
# Запуск через PM2
pm2 start ecosystem.production.config.cjs

# Проверка статуса
pm2 status
pm2 logs edahouse --lines 50
```

### 10. Проверка работоспособности
```bash
# Проверить что сервер отвечает
curl http://localhost:3000/api/version

# Проверить подключение к базе данных
curl http://localhost:3000/api/products

# Проверить логи на наличие ошибок
pm2 logs edahouse --lines 100
```

## Возможные проблемы и решения

### Ошибка: "Column does not exist"
Если в логах видны ошибки о несуществующих колонках, значит миграция не применилась корректно:
```bash
# Повторно выполнить миграцию
psql -h localhost -U edahouse_usr -d edahouse -f migration-add-ingredients-fields.sql
```

### Ошибка: "Module not found" или TypeScript ошибки
```bash
# Очистить кэш и пересобрать
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Ошибка подключения к базе данных
```bash
# Проверить статус PostgreSQL
sudo systemctl status postgresql

# Проверить подключение
psql -h localhost -U edahouse_usr -d edahouse -c "SELECT 1;"
```

### Проблемы с портами/Nginx
```bash
# Перезапустить Nginx
sudo systemctl restart nginx

# Проверить конфигурацию Nginx
sudo nginx -t
```

## Команды для быстрой диагностики

```bash
# Проверить процессы
pm2 list

# Проверить логи в реальном времени
pm2 logs edahouse --follow

# Проверить использование порта
netstat -tlnp | grep :3000

# Проверить статус всех сервисов
sudo systemctl status nginx postgresql
```

## Контакты для экстренной помощи
Если проблема не решается:
1. Сохранить логи: `pm2 logs edahouse > error_logs.txt`
2. Проверить статус базы данных
3. Откатиться на резервную копию если необходимо
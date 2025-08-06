# Быстрое исправление VPS сервера

## Экстренные команды для восстановления работы сайта

### 1. Подключиться к серверу и перейти в директорию
```bash
ssh ordis.co.il
cd /var/www/edahouse.ordis.co.il
```

### 2. Проверить статус и логи
```bash
pm2 status
pm2 logs edahouse --lines 30
```

### 3. Если видны ошибки TypeScript - обновить server/storage.ts
Скопировать исправленный файл server/storage.ts с локальной машины на сервер.

### 4. Перезапустить приложение
```bash
pm2 restart edahouse
```

### 5. Если не помогает - полная перезагрузка
```bash
pm2 stop edahouse
pm2 delete edahouse
pm2 start ecosystem.production.config.cjs
```

### 6. Проверить результат
```bash
curl http://localhost:3000/api/version
curl http://localhost:3000/api/products
```

## Если всё ещё не работает

### Вариант 1: Откат миграции базы данных
```sql
-- Подключиться к базе
psql -h localhost -U edahouse_usr -d edahouse

-- Удалить новые колонки
ALTER TABLE products 
DROP COLUMN IF EXISTS ingredients,
DROP COLUMN IF EXISTS ingredients_en,
DROP COLUMN IF EXISTS ingredients_he,
DROP COLUMN IF EXISTS ingredients_ar,
DROP COLUMN IF EXISTS slider_image,
DROP COLUMN IF EXISTS slider_image_en,
DROP COLUMN IF EXISTS slider_image_he,
DROP COLUMN IF EXISTS slider_image_ar;
```

### Вариант 2: Откат кода к предыдущей версии
```bash
# Посмотреть последние коммиты
git log --oneline -10

# Откатиться на предыдущий рабочий коммит
git reset --hard HEAD~1

# Перезапустить
pm2 restart edahouse
```

## Срочная проверка работоспособности
```bash
# Все эти команды должны работать без ошибок:
curl -s http://localhost:3000/api/version | jq
curl -s http://localhost:3000/api/products | head -50
curl -s http://localhost:3000/api/categories | head -50
```
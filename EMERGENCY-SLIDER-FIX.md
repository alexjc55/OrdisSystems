# ЭКСТРЕННОЕ ИСПРАВЛЕНИЕ ОШИБКИ slider_autoplay

## Проблема
На VPS сервере ошибка: `column "slider_autoplay" does not exist`
Это означает, что в базе данных отсутствуют колонки для настроек слайдера.

## Быстрое решение (3 минуты)

### Вариант 1: Автоматическая миграция
```bash
# Запустить с локальной машины:
./apply-slider-migration.sh
```

### Вариант 2: Ручная миграция
```bash
# 1. Подключиться к VPS серверу
ssh ordis.co.il
cd /var/www/edahouse.ordis.co.il

# 2. Подключиться к базе данных
psql -h localhost -U edahouse_usr -d edahouse

# 3. Добавить недостающие колонки
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slider_autoplay BOOLEAN DEFAULT true;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slider_speed INTEGER DEFAULT 5000;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slider_effect VARCHAR(10) DEFAULT 'fade';

# 4. Обновить существующие записи
UPDATE store_settings SET 
    slider_autoplay = true,
    slider_speed = 5000,
    slider_effect = 'fade'
WHERE id = 1;

# 5. Выйти из psql
\q

# 6. Перезапустить приложение
pm2 restart edahouse
```

### Вариант 3: Экстренный откат (если миграция не помогает)
```bash
# Подключиться к VPS
ssh ordis.co.il
cd /var/www/edahouse.ordis.co.il

# Откатить к предыдущему коммиту
git reset --hard HEAD~1
pm2 restart edahouse
```

## Проверка результата
```bash
# Проверить что API работает
curl http://localhost:3000/api/settings

# Проверить логи
pm2 logs edahouse --lines 20
```

## Если ничего не помогает
```bash
# Полная остановка и запуск
pm2 delete edahouse
pm2 start ecosystem.production.config.cjs

# Проверка портов
netstat -tlnp | grep :3000

# Проверка статуса PostgreSQL
sudo systemctl status postgresql
```

Ошибка должна исчезнуть после добавления колонки `slider_autoplay` в таблицу `store_settings`.
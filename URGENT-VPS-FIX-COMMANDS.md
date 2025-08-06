# СРОЧНЫЕ КОМАНДЫ ДЛЯ ИСПРАВЛЕНИЯ VPS

Выполнить на VPS сервере (ordis.co.il) в точном порядке:

## 1. Подключение и переход в директорию
```bash
ssh ordis.co.il
cd /var/www/edahouse.ordis.co.il
```

## 2. Остановка приложения
```bash
pm2 stop edahouse
```

## 3. Подключение к базе данных и добавление колонки
```bash
psql -h localhost -U edahouse_usr -d edahouse
```

## 4. Выполнить в psql:
```sql
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slider_autoplay BOOLEAN DEFAULT true;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slider_speed INTEGER DEFAULT 5000;  
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slider_effect VARCHAR(10) DEFAULT 'fade';
UPDATE store_settings SET slider_autoplay = true, slider_speed = 5000, slider_effect = 'fade' WHERE id = 1;
\q
```

## 5. Запуск приложения
```bash
pm2 start edahouse
```

## 6. Проверка результата
```bash
pm2 logs edahouse --lines 10
curl http://localhost:3000/api/settings | head -20
```

## Если все еще ошибки - полный перезапуск
```bash
pm2 delete edahouse
pm2 start ecosystem.production.config.cjs
pm2 status
```

КРИТИЧЕСКИ ВАЖНО: Выполнить команды именно в таком порядке!
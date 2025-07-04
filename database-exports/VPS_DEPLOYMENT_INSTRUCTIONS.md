# Инструкция по развертыванию базы данных на VPS

## Файлы для синхронизации с GitHub

1. `database-exports/vps_compatible_export.sql` - Совместимый экспорт данных из Replit для VPS
2. Этот файл содержит:
   - Все продукты (10 основных товаров) и категории
   - Настройки магазина, адаптированные под структуру VPS
   - Только INSERT команды без конфликтов структуры
   - Администратора для доступа в панель

## Команды для выполнения на VPS

После синхронизации файла с GitHub, выполни на VPS:

```bash
# 1. Перейди в директорию проекта
cd ~/www/edahouse.ordis.co.il

# 2. Получи обновления из GitHub
git pull origin main

# 3. Загрузи переменные окружения
source .env

# 4. Останови приложение
pm2 stop edahouse

# 5. Создай бэкап текущей базы (на всякий случай)
pg_dump -U $PGUSER -h $PGHOST -p $PGPORT $PGDATABASE > backup_before_import_$(date +%Y%m%d_%H%M%S).sql

# 6. Восстанови данные из совместимого экспорта
psql -U $PGUSER -h $PGHOST -p $PGPORT $PGDATABASE < database-exports/vps_compatible_export.sql

# 7. Проверь данные
psql -U $PGUSER -h $PGHOST -p $PGPORT $PGDATABASE -c "
SELECT 
  'Продукты: ' || COUNT(*) FROM products
UNION ALL
SELECT 
  'Категории: ' || COUNT(*) FROM categories  
UNION ALL
SELECT 
  'Пользователи: ' || COUNT(*) FROM users
UNION ALL
SELECT 
  'Настройки: ' || store_name FROM store_settings;
"

# 8. Запусти приложение
pm2 start edahouse

# 9. Проверь работу сайта
curl -I https://edahouse.ordis.co.il/api/settings
curl -I https://edahouse.ordis.co.il/api/products
```

## Ожидаемый результат

После успешного выполнения:
- ✅ Все продукты и категории из Replit
- ✅ Настройки магазина и темы оформления  
- ✅ Поддержка всех 4 языков (русский, английский, иврит, арабский)
- ✅ Отключенная блокировка прокрутки Radix UI
- ✅ Исправленное кеширование favicon
- ✅ Админ-панель с полным функционалом

## Данные для входа в админ-панель

После импорта будут доступны все существующие пользователи из Replit.
Если нужен новый админ, создай его через существующую админ-панель.

## В случае проблем

Если возникнут ошибки PostgreSQL:
1. Проверь права доступа: `psql -U $PGUSER -h $PGHOST -p $PGPORT $PGDATABASE -c "SELECT current_user, current_database();"`
2. Восстанови из бэкапа: `psql -U $PGUSER -h $PGHOST -p $PGPORT $PGDATABASE < backup_before_import_*.sql`
3. Обратись за помощью с точным текстом ошибки
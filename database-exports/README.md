# База данных Replit для восстановления на VPS

## Файлы

- `replit_data_export.sql.gz` - Сжатый экспорт базы данных из Replit

## Как восстановить базу данных на VPS

```bash
# 1. Остановить приложение
pm2 stop edahouse

# 2. Загрузить переменные окружения
source .env

# 3. Создать очищенный экспорт (удаляет Neon-специфичные команды)
./database-exports/create_clean_export.sh

# 4. Удалить и пересоздать базу данных
dropdb -U $PGUSER -h $PGHOST -p $PGPORT $PGDATABASE
createdb -U $PGUSER -h $PGHOST -p $PGPORT $PGDATABASE

# 5. Восстановить данные из очищенного экспорта
psql -U $PGUSER -h $PGHOST -p $PGPORT $PGDATABASE < database-exports/clean_data_export.sql

# 6. Запустить приложение
pm2 start edahouse
```

## Что включено в экспорт

- Все продукты и категории
- Настройки магазина
- Темы оформления
- Пользователи и заказы
- Переводы и конфигурация

Дата экспорта: $(date)
# Быстрое руководство по миграции базы данных eDAHouse

## Что обновляется
Эта миграция включает все последние изменения:
- **Расширенные иконки категорий**: 80+ вариантов иконок включая соусы, специи, напитки
- **Единицы измерения**: Полная поддержка "порция" и других единиц
- **Динамическая доставка**: Удаление stored delivery_fee, расчет из настроек магазина
- **Многоязычность**: Обеспечение всех полей для 4 языков (RU/EN/HE/AR)

## Быстрое развертывание (2 минуты)

### Вариант 1: Автоматический скрипт (рекомендуется)
```bash
# Перейди в папку проекта
cd /path/to/your/edahouse-project

# Запусти автоматическую миграцию
chmod +x scripts/run-migration-safe.sh
./scripts/run-migration-safe.sh
```

### Вариант 2: Ручное выполнение
```bash
# Создай резервную копию
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Примени миграцию
psql $DATABASE_URL -f migrations/update-category-icons-system.sql

# Перезапусти приложение
pm2 restart your-app-name
```

## Что происходит в миграции
1. ✅ Добавляются недостающие многоязычные колонки
2. ✅ Устанавливаются иконки по умолчанию для категорий
3. ✅ Удаляется колонка delivery_fee из таблицы orders
4. ✅ Проверяется поддержка единицы "порция"
5. ✅ Добавляются индексы для производительности
6. ✅ Проверяются настройки доставки в store_settings

## Проверка после миграции
```bash
# Подключись к базе
psql $DATABASE_URL

# Проверь что delivery_fee удален из orders
\d orders
# Не должно быть колонки delivery_fee

# Проверь настройки доставки
SELECT delivery_fee, free_delivery_from FROM store_settings;
# Должно показать цифры (например 15.00, 50.00)

# Проверь иконки категорий
SELECT COUNT(*) FROM categories WHERE icon IS NOT NULL;
# Должно быть больше 0

# Выйди
\q
```

## В случае проблем
- Проверь логи: `pm2 logs your-app`
- Восстанови из резервной копии: `psql $DATABASE_URL < backup_file.sql`
- Обратись к подробному руководству: `VPS-DELIVERY-MIGRATION-GUIDE.md`

## Файлы миграции
- `migrations/update-category-icons-system.sql` - Основная миграция
- `scripts/run-migration-safe.sh` - Автоматический скрипт
- `QUICK-MIGRATION-GUIDE.md` - Это руководство

## Важно!
После миграции убедись что приложение обновлено до последней версии кода, иначе могут быть ошибки с доставкой.

```bash
# Обнови код приложения
git pull origin main
npm install
pm2 restart your-app-name
```
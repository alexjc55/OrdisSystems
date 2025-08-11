# Обновление базы данных для удаленного сервера

## Обзор изменений

После недавних исправлений системы переводов и push-уведомлений, удаленным серверам необходимо выполнить обновления базы данных для полной совместимости.

## Исправления, требующие обновления БД

### 1. ✅ Система Push-уведомлений (полностью функциональна)
- **Статус**: Требуется создание таблиц на удаленных серверах
- **Таблицы**: `push_subscriptions`, `marketing_notifications`
- **Функциональность**: Подписки пользователей, история маркетинговых уведомлений

### 2. ✅ Многоязычные поля для логотипов и баннеров
- **Статус**: Уже создана миграция `add-multilingual-logo-fields.sql`
- **Поля**: logo_url_*, banner_image_url_*, cart_banner_image_*, pwa_icon_*
- **Языки**: en, he, ar

### 3. ✅ Исправления переводов интерфейса
- **Статус**: НЕ требует изменений БД
- **Изменения**: Только JSON файлы переводов
- **Исправлено**: 
  - Кнопка "Выход" в профиле (убран арабский текст из русского перевода)
  - Уведомления админ-панели (добавлены "updated", "updateSuccess" во все языки)

## Необходимые миграции

### Для новых серверов (полная настройка):

1. **Основная схема**: `migrations/0000_cheerful_spectrum.sql`
2. **Многоязычные поля**: `migrations/add-multilingual-logo-fields.sql` 
3. **Push-уведомления**: `migrations/add-push-notifications-tables.sql`

### Для существующих серверов (только новые функции):

```bash
# 1. Добавить многоязычные поля (если еще не добавлены)
psql -U your_db_user -d your_database_name -f migrations/add-multilingual-logo-fields.sql

# 2. Добавить таблицы push-уведомлений
psql -U your_db_user -d your_database_name -f migrations/add-push-notifications-tables.sql
```

## Проверка совместимости

### Проверить существование таблиц push-уведомлений:
```sql
-- Проверить существование таблиц
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name = 'push_subscriptions'
);

SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name = 'marketing_notifications'
);
```

### Проверить многоязычные поля:
```sql
-- Проверить существование многоязычных полей в store_settings
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'store_settings' 
AND column_name LIKE '%_en' OR column_name LIKE '%_he' OR column_name LIKE '%_ar';
```

## Процедура обновления для производственного сервера

### 1. Резервное копирование
```bash
# Создать резервную копию базы данных
pg_dump -U your_db_user -h localhost your_database_name > backup_before_push_migration_$(date +%Y%m%d_%H%M%S).sql
```

### 2. Выполнить миграции
```bash
# Подключиться к серверу
ssh user@your-server.com

# Перейти в директорию проекта
cd /path/to/your/project

# Выполнить миграции push-уведомлений
psql -U your_db_user -d your_database_name -f migrations/add-push-notifications-tables.sql

# Если многоязычные поля еще не добавлены:
psql -U your_db_user -d your_database_name -f migrations/add-multilingual-logo-fields.sql
```

### 3. Обновить код приложения
```bash
# Обновить код из репозитория
git pull origin main

# Установить зависимости (если нужно)
npm install

# Перезапустить приложение
pm2 restart your-app-name
```

### 4. Проверить функциональность
- ✅ Push-уведомления: Проверить `/api/admin/push/stats` endpoint
- ✅ Многоязычность: Проверить админ-панель тем
- ✅ Переводы: Проверить интерфейс на всех языках

## Что НЕ требует изменений БД

1. **Переводы интерфейса** - только файлы JSON
2. **Исправления кода** - только серверные файлы
3. **Универсальная система БД** - только код подключения

## Важные примечания

- ⚠️ **Безопасность**: Всегда создавайте резервные копии перед миграциями
- ✅ **Совместимость**: Все миграции используют `IF NOT EXISTS` для безопасного выполнения
- 🔄 **Обратная совместимость**: Существующие данные остаются нетронутыми
- 📊 **Проверка**: После миграции проверьте работу всех функций

## Статус готовности к развертыванию

- ✅ **Push-уведомления**: Полностью функциональны на Replit
- ✅ **Многоязычная система**: Работает корректно
- ✅ **Переводы интерфейса**: Все ключи отображаются правильно
- ✅ **Миграции БД**: Готовы для развертывания на удаленных серверах

После выполнения этих миграций, удаленные серверы будут полностью совместимы с текущей версией eDAHouse со всеми функциями push-уведомлений и многоязычности.
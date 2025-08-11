# 🔍 Быстрая диагностика базы данных на продакшн-сервере

## Шаг 1: Подключение к серверу
```bash
ssh your_username@your_server
```

## Шаг 2: Подключение к базе данных  
```bash
# Найдите настройки подключения в файле .env вашего проекта:
cat /path/to/your/project/.env | grep -E "(DATABASE_URL|PGUSER|PGPASSWORD|PGHOST|PGPORT|PGDATABASE)"

# Подключитесь используя эти данные:
psql -U your_db_user -h your_db_host -d your_database_name
```

## Шаг 3: Запуск диагностики
Скопируйте содержимое файла `DATABASE-DIAGNOSTICS.sql` и выполните в psql.

**ИЛИ** выполните эти быстрые проверки:

```sql
-- 1. Проверка worker_permissions (САМОЕ ВАЖНОЕ)
SELECT worker_permissions FROM store_settings WHERE id = 1;

-- 2. Проверка полей штрих-кодов
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'store_settings' 
AND column_name LIKE 'barcode%';

-- 3. Проверка многоязычных полей в products
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'products' 
AND column_name LIKE '%_en' OR column_name LIKE '%_he' OR column_name LIKE '%_ar';

-- 4. Список всех таблиц
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' ORDER BY table_name;
```

## Шаг 4: Сохранение результатов
```bash
# Выйти из psql
\q

# Создать файл с результатами диагностики
nano diagnostics_results.txt
# Скопируйте туда все результаты команд выше
```

## Шаг 5: Отправка результатов
Отправьте мне содержимое файла `diagnostics_results.txt` - я создам точный план миграции только для недостающих изменений.

---

## 🚨 Если не помните настройки базы данных:

```bash
# Поиск настроек в проекте:
find /path/to/your/project -name "*.env*" -exec cat {} \;
find /path/to/your/project -name "*.config.*" -exec grep -l "database\|postgres\|db" {} \;

# Поиск в PM2 конфигурации:
pm2 show your_app_name
```

Как только получу результаты диагностики - создам индивидуальный план миграции именно для вашей базы данных!
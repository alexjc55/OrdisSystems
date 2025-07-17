# РУКОВОДСТВО ПО ИСПРАВЛЕНИЮ БАЗЫ ДАННЫХ СЕРВЕРА

## 🎯 ЦЕЛЬ
Исправить базу данных на VPS сервере, чтобы она соответствовала рабочей версии в Replit.

## ❌ ПРОБЛЕМА
После применения `migrations/add-barcode-system.sql` на сервере возникли проблемы:
- Добавлены лишние таблицы и поля, которых нет в schema.ts
- Структура базы не соответствует Replit версии
- Штрих-коды могут работать некорректно

## ✅ РЕШЕНИЕ 

### АВТОМАТИЧЕСКИЙ СПОСОБ (рекомендуется)

1. Загрузите файлы на сервер:
```bash
# На сервере в папке проекта
git pull origin main
```

2. Выполните скрипт исправления:
```bash
chmod +x scripts/fix-server-database.sh
./scripts/fix-server-database.sh
```

3. Перезапустите приложение:
```bash
pm2 restart edahouse
```

### РУЧНОЙ СПОСОБ

1. Подключитесь к базе данных:
```bash
psql $DATABASE_URL
```

2. Выполните SQL из файла `migrations/server-database-fix.sql`

3. Проверьте результат:
```sql
-- Должно вернуть: barcode_fields_in_products=1, barcode_config_fields=6
SELECT 
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'products' AND column_name LIKE '%barcode%') as barcode_fields_in_products,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'store_settings' AND column_name LIKE '%barcode%') as barcode_config_fields;
```

## 🔍 ЧТО ДЕЛАЕТ МИГРАЦИЯ

### Удаляет проблемные элементы:
- ❌ Таблица `barcode_config` (не в schema.ts)
- ❌ Таблица `barcode_scan_log` (не в schema.ts) 
- ❌ Поля `barcode_en`, `barcode_he`, `barcode_ar` из products
- ❌ Поля `scanned_weight`, `is_weight_scanned`, `barcode_used` из order_items

### Добавляет правильные элементы:
- ✅ Поле `products.barcode` (VARCHAR(50))
- ✅ Настройки штрих-кодов в `store_settings`:
  - `barcode_system_enabled` (BOOLEAN)
  - `barcode_product_code_start` (INTEGER)
  - `barcode_product_code_end` (INTEGER) 
  - `barcode_weight_start` (INTEGER)
  - `barcode_weight_end` (INTEGER)
  - `barcode_weight_unit` (VARCHAR(10))

### Настраивает систему:
- ✅ Включает штрих-коды для израильского формата
- ✅ Настройки: позиции 2-5 для кода товара, 6-10 для веса
- ✅ Добавляет тестовый штрих-код для товара "Абжерка"

## 🎉 РЕЗУЛЬТАТ

После выполнения миграции:
- База данных сервера идентична Replit версии
- Штрих-коды работают корректно
- Никаких конфликтов с schema.ts
- Система готова к продакшену

## 🆘 ОТКАТ (если что-то пошло не так)

Если скрипт создал резервную копию:
```bash
psql $DATABASE_URL < database_backup_YYYYMMDD_HHMMSS.sql
```

## 📞 ПОДДЕРЖКА

Если возникли проблемы:
1. Проверьте логи: `pm2 logs edahouse`
2. Убедитесь что DATABASE_URL корректный
3. Проверьте что PostgreSQL сервер доступен
4. Обратитесь за помощью с логами ошибок
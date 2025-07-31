# Инструкции по исправлению базы данных на продакшн сервере

## Проблема
Ошибка `errorMissingColumn` в `/api/settings` указывает на то, что в базе данных отсутствуют колонки, которые есть в текущей схеме кода.

## Решение

### Шаг 1: Загрузите SQL-скрипт на сервер
```bash
# Загрузите файл production-database-update.sql на сервер demo.ordis.co.il
# Например, через scp или используя веб-интерфейс хостинга
```

### Шаг 2: Выполните обновление базы данных
```bash
# Подключитесь к серверу и выполните:
cd ~/www/demo.ordis.co.il
psql -U edahouse_usr -h localhost -d edahouse -f production-database-update.sql
```

### Шаг 3: Проверьте результат
После выполнения скрипта должно появиться сообщение:
```
Database update completed successfully. Missing columns have been added.
```

### Шаг 4: Перезапустите приложение
```bash
pm2 restart demo
```

### Шаг 5: Проверьте работу
Откройте сайт и убедитесь, что:
- `/api/settings` возвращает 200 OK вместо 500 ошибки
- Админ-панель загружается без ошибок
- Настройки магазина работают корректно

## Что исправляет скрипт

Скрипт добавляет отсутствующие колонки в таблицу `store_settings`:

1. **PWA поля**: `pwa_icon`, `pwa_name`, `pwa_description`, `pwa_name_en/he/ar`, `pwa_description_en/he/ar`
2. **Современные блоки**: `modern_block1/2/3_icon` и `modern_block1/2/3_text`
3. **Многоязычные поля для арабского**: `store_name_ar`, `welcome_title_ar`, и др.
4. **Многоязычные поля для иврита**: `store_name_he`, `welcome_title_he`, и др.
5. **Многоязычные поля для английского**: `store_name_en`, `welcome_title_en`, и др.
6. **Русские базовые поля**: `about_text_ru`, `banner_button_text_ru`

## Безопасность
- Скрипт использует `IF NOT EXISTS`, поэтому безопасен для повторного выполнения
- Существующие данные не будут изменены
- Добавляются только отсутствующие колонки

## В случае проблем
Если что-то пойдет не так, можно:
1. Проверить логи: `pm2 logs demo --lines 20`
2. Проверить базу данных: `psql -U edahouse_usr -h localhost -d edahouse -c "\d store_settings"`
3. Откатить изменения из бэкапа (если есть)
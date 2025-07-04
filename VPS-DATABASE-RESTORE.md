# Восстановление базы данных на VPS сервере

## Шаг 1: Скачивание дампа с Replit

На VPS сервере выполните:

```bash
# Переход в директорию проекта
cd /var/www/ordis_co_il_usr/data/www/edahouse.ordis.co.il

# Скачивание дампа базы данных с Replit
wget https://replit.com/@alexjc55/edahouse-ordis-co-il/raw/main/full_database_export.sql

# Или альтернативно, скопируйте файл через GitHub если он загружен в репозиторий
```

## Шаг 2: Остановка приложения

```bash
# Остановка приложения
pm2 stop edahouse
```

## Шаг 3: Полное восстановление базы данных

```bash
# Полное удаление и восстановление базы данных
sudo -u postgres dropdb edahouse_ord
sudo -u postgres createdb edahouse_ord -O edahouse_ord

# Импорт дампа
sudo -u postgres psql -d edahouse_ord -f full_database_export.sql

# Проверка успешного импорта
sudo -u postgres psql -d edahouse_ord -c "\dt"
```

## Шаг 4: Перезапуск приложения

```bash
# Запуск приложения
pm2 start edahouse
pm2 logs edahouse --lines 20
```

## Результат

После выполнения всех команд:
- ✅ Все таблицы будут созданы с правильной структурой
- ✅ Все данные будут перенесены с Replit
- ✅ Таблица session будет создана
- ✅ Все мультиязычные поля будут присутствовать
- ✅ Активация тем будет работать без ошибок

## Проверка

Проверьте работоспособность:
1. Откройте https://edahouse.ordis.co.il
2. Попробуйте войти в админ-панель
3. Протестируйте активацию тем
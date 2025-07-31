# Руководство по безопасному обновлению рабочего сайта eDAHouse

## 📋 Подготовка к обновлению

### 1. Создание резервной копии (ОБЯЗАТЕЛЬНО!)
```bash
# Заходим на сервер
ssh your_username@your_server

# Создаем резервную копию базы данных
pg_dump -U your_db_user -h your_db_host -d your_database_name > backup_$(date +%Y%m%d_%H%M%S).sql

# Создаем резервную копию файлов проекта
cp -r /path/to/your/project /path/to/backup/project_backup_$(date +%Y%m%d_%H%M%S)

# Создаем резервную копию изображений
cp -r /path/to/your/project/uploads /path/to/backup/uploads_backup_$(date +%Y%m%d_%H%M%S)
```

### 2. Проверка текущего состояния
```bash
# Проверяем что сайт работает
curl -I https://your-domain.com

# Проверяем процессы PM2
pm2 list

# Проверяем статус базы данных
psql -U your_db_user -h your_db_host -d your_database_name -c "SELECT COUNT(*) FROM products;"
```

## 🔄 Процесс обновления

### Шаг 1: Обновление кода (без остановки сайта)
```bash
# Заходим в папку проекта
cd /path/to/your/project

# Создаем временную копию для безопасности
cp -r . ../project_temp_backup

# Загружаем новый код
git pull origin main
# ИЛИ если загружаете файлы вручную:
# Замените файлы новыми, НО НЕ УДАЛЯЙТЕ:
# - uploads/ (папка с изображениями)
# - .env (файл с настройками)
# - package-lock.json (если есть проблемы с зависимостями)
```

### Шаг 2: Установка зависимостей
```bash
# Обновляем зависимости
npm install

# Пересобираем проект
npm run build
```

### Шаг 3: Миграция базы данных
```bash
# Подключаемся к базе данных
psql -U your_db_user -h your_db_host -d your_database_name

# Выполняем команды из файла PRODUCTION-MIGRATION-SAFE.sql по одной
# ВНИМАНИЕ: Выполняйте по одной команде и проверяйте результат!

# 1. Обновляем права доступа
UPDATE store_settings 
SET worker_permissions = jsonb_set(
    COALESCE(worker_permissions, '{}'::jsonb),
    '{canCreateOrders}',
    'true'::jsonb
)
WHERE id = 1 
AND (worker_permissions IS NULL OR NOT worker_permissions ? 'canCreateOrders');

# 2. Проверяем результат
SELECT worker_permissions FROM store_settings WHERE id = 1;

# Если всё ОК, продолжаем с остальными командами из PRODUCTION-MIGRATION-SAFE.sql
```

### Шаг 4: Перезапуск приложения
```bash
# Мягкий перезапуск без простоя
pm2 restart your_app_name

# ИЛИ если нужен полный перезапуск:
pm2 stop your_app_name
pm2 start your_app_name

# Проверяем что всё работает
pm2 logs your_app_name
```

### Шаг 5: Проверка работоспособности
```bash
# Проверяем что сайт открывается
curl -I https://your-domain.com

# Проверяем основные функции
curl https://your-domain.com/api/products
curl https://your-domain.com/api/categories
curl https://your-domain.com/api/settings
```

## ✅ Проверка новых функций

### 1. Система штрих-кодов
- Зайдите в админ-панель
- Перейдите в "Настройки" → "Система штрих-кодов"
- Проверьте что настройки сохраняются

### 2. Права доступа работников
- Зайдите в "Права доступа"
- Найдите переключатель "Создание заказов"
- Проверьте что кнопка "Создать заказ" появляется/исчезает

### 3. Многоязычность
- Переключите язык сайта
- Проверьте что все тексты переводятся корректно

## 🚨 План отката в случае проблем

### Если что-то пошло не так:

1. **Остановка приложения:**
```bash
pm2 stop your_app_name
```

2. **Возврат к старому коду:**
```bash
cp -r ../project_temp_backup/* .
npm install
npm run build
```

3. **Восстановление базы данных:**
```bash
# Только если база была повреждена!
psql -U your_db_user -h your_db_host -d your_database_name < backup_YYYYMMDD_HHMMSS.sql
```

4. **Перезапуск:**
```bash
pm2 start your_app_name
```

## 📱 Что НЕ изменится после обновления

✅ **Сохранится полностью:**
- Все продукты и их описания
- Все фотографии товаров
- Все заказы и история
- Все пользователи и их данные
- Все настройки магазина
- Все переводы на разные языки

✅ **Новые функции:**
- Возможность временно отключать создание заказов
- Улучшенная система штрих-кодов
- Более стабильная работа админ-панели

## 📞 Поддержка

Если у вас возникнут проблемы:
1. Сначала проверьте логи: `pm2 logs your_app_name`
2. Проверьте статус процессов: `pm2 list`
3. Проверьте подключение к базе данных

## 🎯 Ожидаемое время обновления

- **Подготовка:** 10-15 минут
- **Обновление кода:** 5-10 минут  
- **Миграция БД:** 2-5 минут
- **Тестирование:** 10-15 минут
- **Общее время:** 30-45 минут

⚠️ **Простой сайта:** максимум 2-3 минуты (только во время перезапуска PM2)
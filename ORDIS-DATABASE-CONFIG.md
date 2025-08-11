# Конфигурация базы данных для Ordis.co.il

## Данные подключения

- **База данных**: edahouse_ord
- **Пользователь**: edahouse_ord  
- **Пароль**: 33V0R1N5qi81paiA
- **Хост**: localhost (или IP сервера PostgreSQL)
- **Порт**: 5432

## Переменные окружения (.env)

После установки будет создан файл `.env` со следующими настройками:

```env
# Основные настройки
NODE_ENV=production
PORT=3000

# База данных
DATABASE_URL=postgresql://edahouse_ord:33V0R1N5qi81paiA@localhost:5432/edahouse_ord
PGHOST=localhost
PGPORT=5432
PGDATABASE=edahouse_ord
PGUSER=edahouse_ord
PGPASSWORD=33V0R1N5qi81paiA

# Сессии (генерируется автоматически)
SESSION_SECRET=random_generated_secret

# Домен
DOMAIN=edahouse.ordis.co.il
```

## Команда для проверки подключения

```bash
# Проверка подключения к базе данных
psql -h localhost -U edahouse_ord -d edahouse_ord -c "SELECT version();"
```

## Создание схемы базы данных

После установки проекта автоматически выполнится:

```bash
# Применение схемы базы данных
npm run db:push
```

Это создаст все необходимые таблицы:
- users (пользователи)
- products (товары)
- categories (категории)
- orders (заказы)
- order_items (позиции заказов)
- store_settings (настройки магазина)
- themes (темы оформления)
- sessions (сессии)

## Готовая команда установки

```bash
# Установка с вашими данными базы
ssh your-username@your-server
curl -sSL https://raw.githubusercontent.com/YOUR_USERNAME/edahouse/main/scripts/install-on-vps.sh | bash -s edahouse edahouse.ordis.co.il 3000
```

Скрипт автоматически:
1. Создаст файл .env с правильными настройками базы данных
2. Применит схему базы данных
3. Заполнит базу начальными данными (категории, admin пользователь)
4. Настроит PM2 и Nginx

## Администратор по умолчанию

После установки будет создан администратор:
- **Логин**: admin
- **Пароль**: admin123

**⚠️ Обязательно смените пароль после первого входа!**

## Мониторинг базы данных

```bash
# Подключение к базе данных
psql -h localhost -U edahouse_ord -d edahouse_ord

# Просмотр таблиц
\dt

# Количество товаров
SELECT COUNT(*) FROM products;

# Количество заказов
SELECT COUNT(*) FROM orders;

# Последние заказы
SELECT id, customer_name, total, created_at FROM orders ORDER BY created_at DESC LIMIT 5;
```

## Резервное копирование

```bash
# Создание резервной копии базы данных
pg_dump -h localhost -U edahouse_ord edahouse_ord > backup_$(date +%Y%m%d_%H%M%S).sql

# Восстановление из резервной копии
psql -h localhost -U edahouse_ord -d edahouse_ord < backup_file.sql
```

## Health Check

API эндпоинт для проверки состояния базы данных:
```
GET https://edahouse.ordis.co.il/api/health
```

Ответ:
```json
{
  "status": "healthy",
  "timestamp": "2025-07-02T...",
  "database": "connected",
  "uptime": 123.45
}
```

**Конфигурация готова для использования с существующей базой данных edahouse_ord**
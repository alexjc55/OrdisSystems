# 🤖 Автоматическое обновление eDAHouse

## Что создано:

**`auto-migrate.sql`** - Умный SQL-скрипт который:
- Сам проверяет что отсутствует в базе данных
- Добавляет только недостающие таблицы и поля
- Не трогает существующие данные
- Показывает подробный отчет о действиях

**`run-migration.sh`** - Полностью автоматический bash-скрипт который:
- Создает резервные копии
- Обновляет код и зависимости
- Выполняет миграцию базы данных
- Перезапускает приложение
- Проверяет работоспособность

## 🚀 Как использовать:

### Вариант 1: Только база данных (быстро)
```bash
# Зайти на сервер
ssh your_username@your_server

# Перейти в папку проекта
cd /path/to/your/edahouse/project

# Скачать auto-migrate.sql на сервер и выполнить:
psql "$DATABASE_URL" -f auto-migrate.sql
```

### Вариант 2: Полное обновление (рекомендуется)
```bash
# Зайти на сервер
ssh your_username@your_server

# Перейти в папку проекта
cd /path/to/your/edahouse/project

# Скачать оба файла на сервер, затем:
chmod +x run-migration.sh
./run-migration.sh
```

## ✅ Что произойдет автоматически:

1. **Проверка окружения** - убедится что все настроено правильно
2. **Резервные копии** - создаст бэкапы базы данных и кода
3. **Остановка сайта** - на 2-3 минуты для обновления
4. **Миграция базы данных** - добавит только недостающие части
5. **Обновление кода** - установит зависимости и пересоберет проект
6. **Запуск сайта** - восстановит работу
7. **Проверка** - убедится что всё работает

## 🛡️ Безопасность:

- ✅ Все существующие данные сохраняются
- ✅ Автоматические резервные копии
- ✅ Откат в случае ошибок
- ✅ Проверки на каждом этапе
- ✅ Подробные логи всех действий

## ⏱️ Время обновления: 5-10 минут

## 🎯 Результат:
После обновления у вас будет новая функция - возможность временно отключать создание заказов через админ-панель → Права доступа → "Создание заказов".

---

**Нужна помощь?** Скрипт создает подробные логи и показывает что именно делает на каждом этапе.
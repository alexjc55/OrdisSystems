# БЫСТРОЕ ИСПРАВЛЕНИЕ СЕРВЕРА - .env ФАЙЛ УЖЕ НАСТРОЕН

## 🎯 СИТУАЦИЯ
✅ Файл .env настроен правильно  
✅ DATABASE_URL корректный  
❌ Bash скрипт не видит переменные окружения  

## ⚡ РЕШЕНИЕ - 3 КОМАНДЫ:

На сервере выполните:

### Вариант 1: Node.js миграция (рекомендуется)
```bash
cd /путь/к/проекту
git pull origin main
node migrations/run-sql-with-env.js
pm2 restart edahouse
```

### Вариант 2: Прямое выполнение SQL
```bash
cd /путь/к/проекту
source .env
psql $DATABASE_URL -f migrations/server-database-fix.sql
pm2 restart edahouse
```

### Вариант 3: Если psql недоступен
```bash
cd /путь/к/проекту
npm install pg
node migrations/run-sql-with-env.js
pm2 restart edahouse
```

## 🔍 ПРОВЕРКА УСПЕХА:

```bash
# Проверьте логи
pm2 logs edahouse --lines 20

# Проверьте статус
curl http://localhost:5001/api/health
```

Должно показать: `{"status":"ok"}`

## ✅ РЕЗУЛЬТАТ:

После выполнения:
- База данных синхронизирована с Replit
- Штрих-коды работают корректно  
- Сервер готов к работе

---
**Время**: 2 минуты  
**Команды**: 3-4 строки  
**Результат**: Полностью рабочий сервер
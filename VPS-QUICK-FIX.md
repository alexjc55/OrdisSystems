# БЫСТРОЕ ИСПРАВЛЕНИЕ ПРОБЛЕМ VPS СЕРВЕРА

## 🚨 ПРОБЛЕМА: "DATABASE_URL не установлен!"

### ⚡ БЫСТРОЕ РЕШЕНИЕ (5 минут):

1. **Зайдите на VPS сервер** и перейдите в папку проекта:
```bash
cd /путь/к/проекту
```

2. **Запустите автоматическую настройку**:
```bash
git pull origin main
chmod +x scripts/setup-server-env.sh
./scripts/setup-server-env.sh
```

3. **Отредактируйте DATABASE_URL**:
```bash
nano .env
```

Найдите строку:
```
DATABASE_URL=postgresql://username:password@localhost:5432/edahouse_ord
```

Замените на ваши данные БД:
```
DATABASE_URL=postgresql://ВАШЕ_ИМЯ_ПОЛЬЗОВАТЕЛЯ:ВАШ_ПАРОЛЬ@localhost:5432/ВАША_БД
```

4. **Сохраните файл** (Ctrl+X, Y, Enter)

5. **Запустите исправление базы данных**:
```bash
./scripts/fix-server-database.sh
```

6. **Перезапустите приложение**:
```bash
pm2 restart edahouse
```

## 📋 ПОЛУЧЕНИЕ ДАННЫХ БАЗЫ ДАННЫХ

### Если используете FastPanel/cPanel:
1. Зайдите в панель управления хостингом
2. Найдите раздел "Базы данных" или "PostgreSQL"
3. Посмотрите данные подключения:
   - Хост: обычно `localhost` или IP сервера
   - Порт: обычно `5432`
   - Имя БД: `edahouse_ord` или похожее
   - Пользователь и пароль: созданные ранее

### Если данные БД неизвестны:
```bash
# Попробуйте найти существующие настройки
grep -r "DATABASE" . --include="*.env*"
grep -r "postgresql" . --include="*.js" --include="*.ts"

# Проверьте процессы PM2
pm2 show edahouse
```

## 🆘 АЛЬТЕРНАТИВНОЕ РЕШЕНИЕ

Если проблемы с PostgreSQL, можно временно использовать SQLite:

1. **Создайте .env.sqlite**:
```bash
cat > .env << EOF
NODE_ENV=production
PORT=3000
USE_NEON=false
DATABASE_URL=file:./database.sqlite
SESSION_SECRET=$(openssl rand -base64 32)
EOF
```

2. **Установите SQLite драйвер**:
```bash
npm install better-sqlite3
```

3. **Перезапустите приложение**:
```bash
pm2 restart edahouse
```

## ✅ ПРОВЕРКА УСПЕШНОГО ИСПРАВЛЕНИЯ

После выполнения команд проверьте:

1. **Логи PM2**:
```bash
pm2 logs edahouse --lines 20
```

2. **Статус приложения**:
```bash
pm2 status
```

3. **Доступность сайта**:
```bash
curl http://localhost:3000/api/health
```

Должен вернуть: `{"status":"ok"}`

## 📞 ПОЛУЧЕНИЕ ПОМОЩИ

Если ошибки продолжаются, пришлите:
1. Содержимое `pm2 logs edahouse --lines 50`
2. Содержимое `.env` файла (БЕЗ паролей!)
3. Результат `pm2 status`

---
**Время выполнения**: 5-10 минут  
**Сложность**: Начинающий  
**Результат**: Полностью рабочий сервер с исправленной БД
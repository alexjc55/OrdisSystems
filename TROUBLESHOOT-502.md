# Исправление ошибки 502 Bad Gateway

## Что означает ошибка 502
502 = Nginx не может подключиться к Node.js приложению на порту 3000

## Диагностика в FastPanel

### 1. Проверьте статус Node.js приложения
- Зайдите в FastPanel → **Node.js приложения**
- Найдите приложение `edahouse`
- Статус должен быть **"Работает"** или **"Running"**

**Если статус "Остановлено":**
- Нажмите **"Запустить"**
- Перейдите к шагу 2

### 2. Проверьте логи приложения
- Нажмите на приложение `edahouse`
- Перейдите во вкладку **"Логи"**

**Ищите ошибки типа:**
- `Error: Cannot find module`
- `Database connection failed`
- `Port 3000 is already in use`
- `Permission denied`

### 3. Проверьте настройки приложения
Убедитесь что указано:
- **Стартовый файл**: `dist/index.js`
- **Порт**: `3000`
- **Рабочая директория**: `/var/www/edahouse.ordis.co.il`

## Частые проблемы и решения

### Проблема 1: Файл dist/index.js не найден

**Проверка через SSH:**
```bash
cd /var/www/edahouse.ordis.co.il
ls -la dist/
```

**Если папки dist/ нет:**
```bash
npm run build
```

**Если команда npm не работает:**
```bash
# Проверьте что Node.js установлен
node --version
npm --version

# Если нет, установите
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Проблема 2: База данных не подключается

**Проверьте .env файл:**
```bash
cat .env
```

**Должно быть:**
```
DATABASE_URL=postgresql://edahouse_ord:33V0R1N5qi81paiA@localhost:5432/edahouse_ord
```

**Проверьте подключение к базе:**
```bash
psql -U edahouse_ord -d edahouse_ord -h localhost
```

### Проблема 3: Порт уже занят

**Проверьте что слушает порт 3000:**
```bash
sudo netstat -tlnp | grep :3000
```

**Если порт занят другим процессом:**
```bash
sudo kill -9 PID_процесса
```

### Проблема 4: Права доступа

**Проверьте владельца файлов:**
```bash
ls -la /var/www/edahouse.ordis.co.il
```

**Исправьте права:**
```bash
sudo chown -R www-data:www-data /var/www/edahouse.ordis.co.il
sudo chmod -R 755 /var/www/edahouse.ordis.co.il
```

### Проблема 5: Отсутствуют зависимости

**Переустановите пакеты:**
```bash
cd /var/www/edahouse.ordis.co.il
rm -rf node_modules package-lock.json
npm install
npm run build
```

## Пошаговое исправление

### Шаг 1: Остановите приложение в FastPanel
- Node.js приложения → edahouse → **Остановить**

### Шаг 2: Подключитесь по SSH
```bash
ssh пользователь@ваш-сервер
cd /var/www/edahouse.ordis.co.il
```

### Шаг 3: Проверьте структуру проекта
```bash
ls -la
# Должны быть: package.json, server/, client/, dist/
```

### Шаг 4: Проверьте что dist/ существует
```bash
ls -la dist/
# Должен быть: index.js
```

**Если dist/ нет:**
```bash
npm install
npm run build
```

### Шаг 5: Проверьте .env файл
```bash
cat .env
```

**Если файла нет, создайте:**
```bash
cat > .env << 'EOF'
DATABASE_URL=postgresql://edahouse_ord:33V0R1N5qi81paiA@localhost:5432/edahouse_ord
PGHOST=localhost
PGPORT=5432
PGDATABASE=edahouse_ord
PGUSER=edahouse_ord
PGPASSWORD=33V0R1N5qi81paiA
SESSION_SECRET=WAVl58TU5MAzQkQa6w8YTsuFYyyCwIl24D2j5BNsX4reNv1iYPdNQHtog2Y0CYQ39U1HGYYG1cNQhLIGfxPVNg==
PORT=3000
NODE_ENV=production
ENABLE_REGISTRATION=true
ENABLE_GUEST_ORDERS=true
MAX_FILE_SIZE=5242880
UPLOAD_PATH=./uploads
ALLOWED_ORIGINS=https://edahouse.ordis.co.il
STORE_NAME=edahouse
STORE_DESCRIPTION=Food delivery service
EOF
```

### Шаг 6: Проверьте базу данных
```bash
npm run db:push
```

### Шаг 7: Тестовый запуск вручную
```bash
node dist/index.js
```

**Должно появиться:**
```
🌱 Seeding database...
✅ Database already contains data, skipping seed
🚀 Server running on port 3000
```

**Если все работает, нажмите Ctrl+C**

### Шаг 8: Запустите через FastPanel
- Вернитесь в FastPanel
- Node.js приложения → edahouse → **Запустить**

### Шаг 9: Проверьте сайт
Откройте: `https://edahouse.ordis.co.il`

## Дополнительная диагностика

### Проверка Nginx конфигурации
В FastPanel:
- Домены → edahouse.ordis.co.il → **Настройки**
- Убедитесь что прокси настроен на `http://localhost:3000`

### Проверка логов Nginx
```bash
sudo tail -f /var/log/nginx/error.log
```

### Проверка системных ресурсов
```bash
# Свободная память
free -m

# Место на диске
df -h

# Процессы Node.js
ps aux | grep node
```

## Если ничего не помогает

### Полная переустановка:
```bash
# 1. Остановите приложение в FastPanel
# 2. Удалите все файлы
cd /var/www/edahouse.ordis.co.il
rm -rf * .*

# 3. Заново клонируйте проект
git clone https://github.com/alexjc55/Ordis.git .
npm install
npm run build
npm run db:push

# 4. Запустите в FastPanel
```

### Обращение в поддержку
Предоставьте:
- Скриншот ошибки 502
- Логи из FastPanel
- Вывод команды `node dist/index.js`
- Содержимое файла .env

## Команды для быстрой диагностики

```bash
# Одной командой проверить все
cd /var/www/edahouse.ordis.co.il && \
echo "=== Структура проекта ===" && ls -la && \
echo "=== Файл dist/index.js ===" && ls -la dist/ && \
echo "=== Файл .env ===" && cat .env && \
echo "=== База данных ===" && npm run db:push && \
echo "=== Тестовый запуск ===" && timeout 10s node dist/index.js
```

После исправления сайт должен открываться по адресу https://edahouse.ordis.co.il без ошибок!
# Исправление проблемы пустого репозитория

## Проблема
Скрипт установки создал пустой git репозиторий вместо клонирования рабочего проекта. Это произошло из-за неправильного адреса репозитория в скрипте.

## ✅ Решение выполнено

Исправлен скрипт `install-on-vps.sh`:
- Заменена заглушка на реальный репозиторий: `https://github.com/alexjc55/Ordis.git`
- Добавлена проверка успешности клонирования
- Добавлена автоматическая очистка старых директорий

## Команды для исправления на сервере

### Вариант 1: Ручное исправление (быстро)
```bash
# Переходим в родительскую директорию
cd /var/www/ordis_co_il_usr/data/www/

# Удаляем пустую директорию
rm -rf edahouse.ordis.co.il

# Клонируем правильный репозиторий
git clone https://github.com/alexjc55/Ordis.git edahouse.ordis.co.il

# Переходим в проект
cd edahouse.ordis.co.il

# Проверяем что файлы есть
ls -la
# Должны быть: package.json, server/, client/, и т.д.

# Устанавливаем зависимости
npm install

# Создаем .env файл (используйте существующий или создайте новый)
cp /path/to/existing/.env .env  # если есть бэкап
# ИЛИ создайте новый:
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

# Создаем необходимые директории
mkdir -p uploads/images logs backups

# Собираем проект
npm run build

# Настраиваем схему базы данных
npm run db:push

# Запускаем через PM2
pm2 start ecosystem.edahouse.config.cjs
pm2 save
```

### Вариант 2: Полная переустановка (с новым скриптом)
```bash
# Останавливаем и удаляем старое приложение
pm2 delete edahouse 2>/dev/null || true

# Удаляем старую директорию
rm -rf /var/www/ordis_co_il_usr/data/www/edahouse.ordis.co.il

# Запускаем исправленный скрипт установки
curl -sSL https://raw.githubusercontent.com/alexjc55/Ordis/main/scripts/install-on-vps.sh | bash -s edahouse edahouse.ordis.co.il 3000
```

## Проверка после исправления

### 1. Проверить структуру проекта
```bash
cd /var/www/ordis_co_il_usr/data/www/edahouse.ordis.co.il
ls -la
# Должны быть:
# - package.json
# - server/
# - client/
# - shared/
# - scripts/
# - ecosystem.edahouse.config.cjs
# - .env
```

### 2. Проверить PM2
```bash
pm2 status
pm2 logs edahouse --lines 20
```

### 3. Проверить API
```bash
# Локально
curl http://localhost:3000/api/health

# Через домен
curl https://edahouse.ordis.co.il/api/health
```

### 4. Проверить веб-интерфейс
Откройте в браузере: https://edahouse.ordis.co.il

## Что изменилось в скриптах

### install-on-vps.sh
- ✅ Исправлен адрес репозитория на `https://github.com/alexjc55/Ordis.git`
- ✅ Добавлена проверка успешности клонирования
- ✅ Автоматическая очистка старых директорий

### update-project.sh  
- ✅ Добавлена проверка и исправление remote origin
- ✅ Автоматическое переключение на правильный репозиторий

## Важные файлы конфигурации

### .env
Убедитесь что файл содержит все необходимые переменные:
```env
DATABASE_URL=postgresql://edahouse_ord:33V0R1N5qi81paiA@localhost:5432/edahouse_ord
SESSION_SECRET=WAVl58TU5MAzQkQa6w8YTsuFYyyCwIl24D2j5BNsX4reNv1iYPdNQHtog2Y0CYQ39U1HGYYG1cNQhLIGfxPVNg==
PORT=3000
NODE_ENV=production
```

### ecosystem.edahouse.config.cjs
PM2 конфигурация с правильными переменными окружения.

## Результат
После исправления проект будет полностью рабочим с:
- Правильными исходными файлами
- Настроенной базой данных
- Рабочим PM2 процессом
- SSL сертификатом
- Nginx конфигурацией

**Проблема решена**: теперь скрипты клонируют настоящий репозиторий с рабочим кодом.
# Развертывание eDAHouse через FastPanel

## Преимущества FastPanel
- Автоматическое управление доменами и SSL
- Встроенный менеджер баз данных
- Простое управление Node.js приложениями
- Автоматический Nginx reverse proxy

## Подготовка в FastPanel

### 1. Создание базы данных
В FastPanel перейдите в раздел **Базы данных** → **PostgreSQL**:
- Создайте новую базу данных: `edahouse_ord`
- Создайте пользователя: `edahouse_ord`
- Установите пароль: `33V0R1N5qi81paiA`
- Предоставьте полные права пользователю на базу

### 2. Настройка домена
В разделе **Домены**:
- Убедитесь что `edahouse.ordis.co.il` добавлен
- SSL сертификат должен быть активен (Let's Encrypt)
- Проверьте что домен корректно резолвится

### 3. Создание Node.js приложения
В разделе **Node.js приложения**:
- Создайте новое приложение
- Имя: `edahouse`
- Домен: `edahouse.ordis.co.il`
- Версия Node.js: 18 или 20
- Порт: `3000`

## Развертывание проекта

### Метод 1: Через Git (рекомендуемый)

1. **Подключитесь к серверу по SSH** (данные из FastPanel)
2. **Перейдите в директорию домена**:
```bash
cd /var/www/edahouse.ordis.co.il
```

3. **Клонируйте проект**:
```bash
git clone https://github.com/alexjc55/Ordis.git .
```

4. **Установите зависимости**:
```bash
npm install
```

5. **Создайте .env файл**:
```bash
cat > .env << 'EOF'
# Database Configuration
DATABASE_URL=postgresql://edahouse_ord:33V0R1N5qi81paiA@localhost:5432/edahouse_ord
PGHOST=localhost
PGPORT=5432
PGDATABASE=edahouse_ord
PGUSER=edahouse_ord
PGPASSWORD=33V0R1N5qi81paiA

# Session Configuration
SESSION_SECRET=WAVl58TU5MAzQkQa6w8YTsuFYyyCwIl24D2j5BNsX4reNv1iYPdNQHtog2Y0CYQ39U1HGYYG1cNQhLIGfxPVNg==

# Server Configuration
PORT=3000
NODE_ENV=production

# Store Configuration
STORE_NAME=edahouse
STORE_DESCRIPTION=Food delivery service

# Features
ENABLE_REGISTRATION=true
ENABLE_GUEST_ORDERS=true

# File Upload
MAX_FILE_SIZE=5242880
UPLOAD_PATH=./uploads

# Security
ALLOWED_ORIGINS=https://edahouse.ordis.co.il
EOF
```

6. **Создайте необходимые директории**:
```bash
mkdir -p uploads/images logs backups
```

7. **Соберите проект**:
```bash
npm run build
```

8. **Настройте схему базы данных**:
```bash
npm run db:push
```

### Метод 2: Через FastPanel File Manager

1. В FastPanel откройте **File Manager**
2. Перейдите в директорию домена `/var/www/edahouse.ordis.co.il`
3. Загрузите ZIP архив проекта
4. Распакуйте архив
5. Выполните команды установки через Terminal в FastPanel

## Настройка в FastPanel

### 1. Конфигурация Node.js приложения
В разделе **Node.js приложения** → **Настройки edahouse**:

**Startup file**: `dist/index.js`
**Environment variables**:
```
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://edahouse_ord:33V0R1N5qi81paiA@localhost:5432/edahouse_ord
SESSION_SECRET=WAVl58TU5MAzQkQa6w8YTsuFYyyCwIl24D2j5BNsX4reNv1iYPdNQHtog2Y0CYQ39U1HGYYG1cNQhLIGfxPVNg==
ENABLE_REGISTRATION=true
ENABLE_GUEST_ORDERS=true
MAX_FILE_SIZE=5242880
UPLOAD_PATH=./uploads
ALLOWED_ORIGINS=https://edahouse.ordis.co.il
STORE_NAME=edahouse
STORE_DESCRIPTION=Food delivery service
```

### 2. Запуск приложения
- Нажмите **Start** в управлении Node.js приложением
- Убедитесь что статус показывает **Running**
- Проверьте логи на наличие ошибок

### 3. Настройка автозапуска
- Включите **Auto start** для автоматического запуска после перезагрузки сервера
- Настройте **Auto restart** при падении процесса

## Nginx конфигурация (автоматическая)

FastPanel автоматически создает Nginx конфигурацию:
- Reverse proxy на localhost:3000
- SSL терминация
- Статические файлы из public директории
- Gzip компрессия

Если нужна кастомная конфигурация, отредактируйте в разделе **Домены** → **Nginx конфигурация**.

## Проверка развертывания

### 1. Проверка приложения
```bash
curl https://edahouse.ordis.co.il/api/health
```

Ожидаемый ответ:
```json
{
  "status": "healthy",
  "timestamp": "2025-07-02T...",
  "environment": "production",
  "database": "connected"
}
```

### 2. Проверка базы данных
В FastPanel → **Базы данных** → **phpPgAdmin**:
- Подключитесь к базе `edahouse_ord`
- Убедитесь что таблицы созданы

### 3. Проверка логов
В FastPanel → **Node.js приложения** → **Логи edahouse**

## Обновление проекта

### Через Git
```bash
cd /var/www/edahouse.ordis.co.il
git pull origin main
npm install
npm run build
npm run db:push
```

Затем в FastPanel перезапустите Node.js приложение.

### Через FastPanel
1. Загрузите новую версию через File Manager
2. Выполните команды сборки через Terminal
3. Перезапустите приложение

## Мониторинг

### В FastPanel доступно:
- Статистика использования ресурсов
- Логи приложения в реальном времени  
- Статус процессов
- SSL сертификаты

### Дополнительный мониторинг:
```bash
# Проверка процесса
ps aux | grep node

# Проверка портов
netstat -tlnp | grep :3000

# Мониторинг логов
tail -f /var/www/edahouse.ordis.co.il/logs/combined.log
```

## Backup стратегия

### Автоматические бэкапы в FastPanel:
- Настройте регулярные бэкапы базы данных
- Настройте бэкапы файлов проекта
- Храните бэкапы в облачном хранилище

### Ручной бэкап:
```bash
# Бэкап базы данных
pg_dump -U edahouse_ord -h localhost edahouse_ord > backup_$(date +%Y%m%d).sql

# Бэкап файлов
tar -czf edahouse_backup_$(date +%Y%m%d).tar.gz /var/www/edahouse.ordis.co.il
```

## Безопасность

FastPanel обеспечивает:
- Firewall конфигурацию
- SSL сертификаты
- Автоматические обновления безопасности
- Изоляцию приложений

Дополнительно настройте:
- Регулярные обновления Node.js
- Мониторинг безопасности
- Ограничения на загрузку файлов

## Преимущества FastPanel развертывания

✅ **Простота**: Графический интерфейс для всех операций
✅ **Автоматизация**: SSL, Nginx, домены настраиваются автоматически  
✅ **Мониторинг**: Встроенные инструменты мониторинга
✅ **Безопасность**: Автоматические обновления безопасности
✅ **Backup**: Встроенная система резервного копирования
✅ **Масштабирование**: Легкое управление ресурсами

Развертывание через FastPanel значительно проще чем ручная настройка VPS!
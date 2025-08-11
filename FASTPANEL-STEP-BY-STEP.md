# Пошаговая установка eDAHouse через FastPanel для начинающих

## ШАГ 1: Создание базы данных в FastPanel

### 1.1 Вход в FastPanel
- Откройте браузер и зайдите в админ-панель FastPanel (обычно https://ваш-домен:8888)
- Введите логин и пароль от FastPanel

### 1.2 Переход к базам данных
- В левом меню найдите раздел **"Базы данных"**
- Нажмите на **"PostgreSQL"**

### 1.3 Создание базы данных
- Нажмите кнопку **"Создать базу данных"** или **"+"**
- Заполните поля:
  - **Имя базы**: `edahouse_ord`
  - **Описание**: `База данных для интернет-магазина eDAHouse`
- Нажмите **"Создать"**

### 1.4 Создание пользователя базы данных
- В том же разделе PostgreSQL найдите **"Пользователи"**
- Нажмите **"Создать пользователя"**
- Заполните поля:
  - **Имя пользователя**: `edahouse_ord`
  - **Пароль**: `33V0R1N5qi81paiA`
  - **Подтвердите пароль**: `33V0R1N5qi81paiA`
- Нажмите **"Создать"**

### 1.5 Назначение прав пользователю
- Найдите созданную базу `edahouse_ord` в списке
- Нажмите на нее, затем **"Права доступа"**
- Выберите пользователя `edahouse_ord`
- Установите все галочки (SELECT, INSERT, UPDATE, DELETE)
- Нажмите **"Сохранить"**

**Результат**: База данных создана и готова к работе ✅

---

## ШАГ 2: Подключение по SSH и загрузка проекта

### 2.1 Получение данных для SSH
- В FastPanel перейдите в раздел **"SSH доступ"** или **"Терминал"**
- Найдите данные для подключения:
  - IP сервера
  - Имя пользователя (обычно root или другое)
  - Пароль или SSH ключ

### 2.2 Подключение по SSH

**Для Windows (используйте PuTTY или встроенный терминал):**
```bash
ssh пользователь@IP-адрес-сервера
```

**Для Mac/Linux:**
```bash
ssh пользователь@IP-адрес-сервера
```

Введите пароль когда система запросит.

### 2.3 Переход в директорию сайта
```bash
cd /var/www/edahouse.ordis.co.il
```

**Если директории нет, создайте её:**
```bash
sudo mkdir -p /var/www/edahouse.ordis.co.il
sudo chown $(whoami):$(whoami) /var/www/edahouse.ordis.co.il
cd /var/www/edahouse.ordis.co.il
```

### 2.4 Очистка директории (если что-то есть)
```bash
rm -rf * .*
```

### 2.5 Клонирование проекта с GitHub
```bash
git clone https://github.com/alexjc55/Ordis.git .
```

**Объяснение команды:**
- `git clone` - скачивает код с GitHub
- `https://github.com/alexjc55/Ordis.git` - адрес репозитория
- `.` - точка означает "в текущую папку"

### 2.6 Проверка что файлы скачались
```bash
ls -la
```

**Должны появиться файлы:**
- package.json
- server/
- client/
- shared/
- и другие

**Результат**: Код проекта загружен на сервер ✅

---

## ШАГ 3: Установка зависимостей и сборка проекта

### 3.1 Установка пакетов Node.js
```bash
npm install
```

**Что происходит:**
- Команда читает файл package.json
- Скачивает все необходимые библиотеки
- Процесс займет 2-5 минут

**Если команда не найдена:**
```bash
# Установка Node.js (если нет)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 3.2 Создание файла настроек (.env)
```bash
cat > .env << 'EOF'
# База данных
DATABASE_URL=postgresql://edahouse_ord:33V0R1N5qi81paiA@localhost:5432/edahouse_ord
PGHOST=localhost
PGPORT=5432
PGDATABASE=edahouse_ord
PGUSER=edahouse_ord
PGPASSWORD=33V0R1N5qi81paiA

# Безопасность
SESSION_SECRET=WAVl58TU5MAzQkQa6w8YTsuFYyyCwIl24D2j5BNsX4reNv1iYPdNQHtog2Y0CYQ39U1HGYYG1cNQhLIGfxPVNg==

# Сервер
PORT=3000
NODE_ENV=production

# Магазин
STORE_NAME=edahouse
STORE_DESCRIPTION=Food delivery service

# Функции
ENABLE_REGISTRATION=true
ENABLE_GUEST_ORDERS=true

# Загрузка файлов
MAX_FILE_SIZE=5242880
UPLOAD_PATH=./uploads

# Домен
ALLOWED_ORIGINS=https://edahouse.ordis.co.il
EOF
```

### 3.3 Создание папок для файлов
```bash
mkdir -p uploads/images logs backups
```

### 3.4 Сборка проекта
```bash
npm run build
```

**Что происходит:**
- Код TypeScript компилируется в JavaScript
- Создается папка dist/ с готовым приложением
- Процесс займет 1-3 минуты

### 3.5 Настройка структуры базы данных
```bash
npm run db:push
```

**Что происходит:**
- Создаются таблицы в базе данных
- Заполняются начальные данные
- Настраиваются связи между таблицами

**Результат**: Проект собран и готов к запуску ✅

---

## ШАГ 4: Создание Node.js приложения в FastPanel

### 4.1 Переход к Node.js приложениям
- Вернитесь в веб-интерфейс FastPanel
- В левом меню найдите **"Node.js"** или **"Приложения"**
- Нажмите **"Node.js приложения"**

### 4.2 Создание нового приложения
- Нажмите кнопку **"Создать приложение"** или **"+"**
- Заполните поля:

**Основные настройки:**
- **Имя приложения**: `edahouse`
- **Домен**: выберите `edahouse.ordis.co.il` из списка
- **Путь к приложению**: `/var/www/edahouse.ordis.co.il`
- **Стартовый файл**: `dist/index.js`
- **Порт**: `3000`
- **Версия Node.js**: выберите 18 или 20

### 4.3 Настройка переменных окружения
В разделе **"Переменные окружения"** добавьте:

```
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://edahouse_ord:33V0R1N5qi81paiA@localhost:5432/edahouse_ord
PGHOST=localhost
PGPORT=5432
PGDATABASE=edahouse_ord
PGUSER=edahouse_ord
PGPASSWORD=33V0R1N5qi81paiA
SESSION_SECRET=WAVl58TU5MAzQkQa6w8YTsuFYyyCwIl24D2j5BNsX4reNv1iYPdNQHtog2Y0CYQ39U1HGYYG1cNQhLIGfxPVNg==
ENABLE_REGISTRATION=true
ENABLE_GUEST_ORDERS=true
MAX_FILE_SIZE=5242880
UPLOAD_PATH=./uploads
ALLOWED_ORIGINS=https://edahouse.ordis.co.il
STORE_NAME=edahouse
STORE_DESCRIPTION=Food delivery service
```

**Как добавлять переменные:**
- Нажмите **"Добавить переменную"**
- В поле **"Имя"** введите название (например, NODE_ENV)
- В поле **"Значение"** введите значение (например, production)
- Повторите для всех переменных

### 4.4 Дополнительные настройки
- **Автозапуск**: включите галочку
- **Автоперезапуск**: включите галочку
- **Максимум памяти**: 512MB или 1GB

### 4.5 Сохранение приложения
- Нажмите **"Создать"** или **"Сохранить"**

**Результат**: Приложение создано в FastPanel ✅

---

## ШАГ 5: Запуск и проверка

### 5.1 Запуск приложения
- В списке Node.js приложений найдите `edahouse`
- Нажмите кнопку **"Старт"** или **"Запустить"**
- Статус должен измениться на **"Работает"** или **"Running"**

### 5.2 Проверка логов
- Нажмите на приложение `edahouse`
- Перейдите во вкладку **"Логи"**
- Должны увидеть сообщения типа:
  ```
  🌱 Seeding database...
  ✅ Database already contains data, skipping seed
  🚀 Server running on port 3000
  ```

### 5.3 Проверка работы сайта
Откройте в браузере: `https://edahouse.ordis.co.il`

**Должна открыться главная страница магазина**

### 5.4 Проверка API
Откройте в браузере: `https://edahouse.ordis.co.il/api/health`

**Должен появиться JSON ответ:**
```json
{
  "status": "healthy",
  "timestamp": "2025-07-02T...",
  "environment": "production",
  "database": "connected"
}
```

**Результат**: Сайт работает и доступен пользователям ✅

---

## Что делать если что-то не работает

### Проблема: Приложение не запускается
**Решение:**
1. Проверьте логи в FastPanel
2. Убедитесь что файл `dist/index.js` существует
3. Проверьте что все переменные окружения указаны правильно

### Проблема: База данных не подключается
**Решение:**
1. Проверьте что база данных `edahouse_ord` создана
2. Проверьте что пользователь `edahouse_ord` имеет права
3. Убедитесь что пароль указан правильно в переменных

### Проблема: Сайт показывает 502 ошибку
**Решение:**
1. Убедитесь что приложение запущено в FastPanel
2. Проверьте что порт 3000 указан правильно
3. Перезапустите приложение

### Проблема: Нет доступа по SSH
**Решение:**
1. Проверьте IP адрес сервера
2. Убедитесь что используете правильный логин/пароль
3. Обратитесь к хостинг-провайдеру за данными SSH

---

## Важные файлы и команды

### Основные команды для управления:
```bash
# Перезапуск через SSH
cd /var/www/edahouse.ordis.co.il
npm run build

# Обновление кода
git pull origin main
npm install
npm run build

# Просмотр логов
tail -f logs/combined.log
```

### Где что находится:
- **Код проекта**: `/var/www/edahouse.ordis.co.il`
- **Настройки**: `.env` файл
- **Логи**: `logs/` папка
- **Загруженные файлы**: `uploads/` папка

**Поздравляем! Ваш интернет-магазин eDAHouse успешно установлен и работает!** 🎉
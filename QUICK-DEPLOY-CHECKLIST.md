# Быстрый чек-лист деплоя eDAHouse

## ✅ Пошаговые действия (для чайников)

### 1. Подготовка сервера (10-15 минут)
```bash
# Подключитесь к вашему VPS через SSH
ssh root@ваш_ip_адрес

# Скопируйте и выполните эти команды по очереди:
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2
sudo apt install postgresql postgresql-contrib nginx git -y
```

### 2. Настройка базы данных (5 минут)
```bash
# Войти в PostgreSQL
sudo -u postgres psql

# Выполнить эти команды в PostgreSQL (не забудьте поменять пароль):
CREATE DATABASE edahouse;
CREATE USER edahouse_user WITH ENCRYPTED PASSWORD 'ваш_сложный_пароль_здесь';
GRANT ALL PRIVILEGES ON DATABASE edahouse TO edahouse_user;
\q
```

### 3. Загрузка проекта (5 минут)
```bash
# Создать папку для проектов
cd /var/www

# Скачать файлы проекта (один из способов):
# Вариант 1: Если у вас есть Git репозиторий
sudo git clone https://github.com/ваш_username/edahouse.git

# Вариант 2: Если загружаете архив
sudo wget your_project_archive.zip
sudo unzip your_project_archive.zip
sudo mv extracted_folder edahouse

# Дать права пользователю
sudo chown -R $USER:$USER edahouse
cd edahouse
```

### 4. Настройка окружения (3 минуты)
```bash
# Создать файл настроек
cp .env.example .env
nano .env
```

**В файле .env вписать (заменить пароль):**
```
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://edahouse_user:ваш_сложный_пароль_здесь@localhost:5432/edahouse
SESSION_SECRET=очень_длинная_случайная_строка_минимум_32_символа
PGHOST=localhost
PGPORT=5432
PGDATABASE=edahouse
PGUSER=edahouse_user
PGPASSWORD=ваш_сложный_пароль_здесь
```

### 5. Запуск проекта (5 минут)
```bash
# Установить зависимости и запустить
npm install
npm run build
npm run db:push
chmod +x deploy.sh
./deploy.sh
```

### 6. Настройка DNS (в панели домена)
- Зайти в панель управления доменом ordi.co.il
- Добавить A-запись:
  - **Имя:** edahouse  
  - **Тип:** A
  - **Значение:** IP адрес вашего VPS
  - **TTL:** 300

### 7. Настройка Nginx (5 минут)
```bash
# Создать конфигурацию
sudo nano /etc/nginx/sites-available/edahouse.ordi.co.il
```

**Вставить в файл:**
```nginx
server {
    listen 80;
    server_name edahouse.ordi.co.il;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /uploads/ {
        alias /var/www/edahouse/uploads/;
    }

    client_max_body_size 50M;
}
```

```bash
# Активировать конфигурацию
sudo ln -s /etc/nginx/sites-available/edahouse.ordi.co.il /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 8. Установка SSL (5 минут)
```bash
# Установить Certbot
sudo apt install certbot python3-certbot-nginx -y

# Получить SSL сертификат
sudo certbot --nginx -d edahouse.ordi.co.il
```

## 🎉 Готово!

Откройте в браузере: **https://edahouse.ordi.co.il**

## 🔧 Полезные команды

```bash
# Проверить статус приложения
pm2 status

# Посмотреть логи
pm2 logs edahouse

# Перезапустить приложение
pm2 restart edahouse

# Обновить проект (если есть изменения)
cd /var/www/edahouse
git pull
npm install
npm run build
pm2 restart edahouse
```

## 🆘 Если что-то пошло не так

1. **Проверить логи приложения:** `pm2 logs edahouse`
2. **Проверить логи Nginx:** `sudo tail -f /var/log/nginx/error.log`
3. **Проверить статус сервисов:** 
   - `sudo systemctl status nginx`
   - `sudo systemctl status postgresql`
4. **Перезапустить все:**
   - `pm2 restart edahouse`
   - `sudo systemctl restart nginx`

## 📞 Типичные проблемы

- **Сайт не открывается:** Проверить DNS (nslookup edahouse.ordi.co.il)
- **Ошибка базы данных:** Проверить настройки в .env файле
- **502 Bad Gateway:** Проверить, запущено ли приложение (pm2 status)
- **Проблемы с SSL:** Повторить команду `sudo certbot --nginx -d edahouse.ordi.co.il`
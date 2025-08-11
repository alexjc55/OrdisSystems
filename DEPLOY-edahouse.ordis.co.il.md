# Команды развертывания для edahouse.ordis.co.il

## База данных (уже создана)
- **База**: edahouse_ord
- **Пользователь**: edahouse_ord
- **Пароль**: 33V0R1N5qi81paiA
- **Путь установки**: /var/www/ordis_co_il_usr/data/www/edahouse.ordis.co.il

## Готовые команды для копирования

### 1. Сначала создайте Git репозиторий
```bash
# В Replit или на вашем компьютере
git init
git add .
git commit -m "eDAHouse delivery system ready for production"
git remote add origin https://github.com/YOUR_USERNAME/edahouse.git
git push -u origin main
```

### 2. Команда для установки на VPS
Замените только `YOUR_USERNAME` и `YOUR_VPS_IP`:

```bash
ssh root@YOUR_VPS_IP
curl -sSL https://raw.githubusercontent.com/YOUR_USERNAME/edahouse/main/scripts/install-on-vps.sh | bash -s edahouse edahouse.ordis.co.il 3000
```

### 3. Проверка после установки
```bash
# Проверить что сайт работает
curl -I https://edahouse.ordis.co.il

# Проверить API
curl https://edahouse.ordis.co.il/api/health

# Проверить статус PM2
pm2 status
```

## Настройка DNS

В панели управления вашим доменом ordis.co.il добавьте:

- **Тип записи**: A
- **Имя**: edahouse  
- **Значение**: IP_адрес_вашего_VPS
- **TTL**: 300

Проверить: `nslookup edahouse.ordis.co.il`

## Данные для входа в админку

После установки:
- **URL**: https://edahouse.ordis.co.il/auth
- **Логин**: admin
- **Пароль**: admin123

**⚠️ ВАЖНО: Сразу после установки смените пароль администратора!**

## Команды обслуживания

```bash
# Обновление проекта (сохраняет все данные)
cd /var/www/ordis_co_il_usr/data/www/edahouse.ordis.co.il
./update-edahouse.sh

# Резервная копия
./scripts/backup.sh edahouse

# Проверка работоспособности  
./scripts/health-check.sh edahouse

# Логи приложения
pm2 logs edahouse

# Перезапуск
pm2 restart edahouse
```

## Добавление второго сайта на тот же VPS

Если захотите добавить еще один магазин:

```bash
cd /var/www/ordis_co_il_usr/data/www/edahouse.ordis.co.il
./scripts/create-multisite.sh

# Введите:
# - Название: shop2
# - Домен: shop2.ordis.co.il  
# - Порт: 3001
```

## Что происходит при установке

1. **Установка софта**: Node.js, PostgreSQL, Nginx, PM2, SSL
2. **Создание БД**: edahouse_db с начальными данными
3. **Настройка Nginx**: автоматический SSL от Let's Encrypt
4. **Запуск приложения**: PM2 с автозапуском при перезагрузке
5. **Настройка файрвола**: открытие портов 80, 443, 22

## Файлы проекта на сервере

```
/var/www/ordis_co_il_usr/data/www/edahouse.ordis.co.il/
├── client/          # Фронтенд
├── server/          # Бэкенд  
├── uploads/         # Загруженные файлы (сохраняются при обновлениях)
├── .env             # Конфигурация (сохраняется при обновлениях)
├── update-edahouse.sh   # Скрипт обновления
└── scripts/         # Служебные скрипты
```

**Ваш домен edahouse.ordis.co.il готов к развертыванию!**
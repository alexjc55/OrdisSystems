# ✅ ГОТОВО К РАЗВЕРТЫВАНИЮ - edahouse.ordis.co.il

## Ваши настройки

- **Домен**: edahouse.ordis.co.il
- **Папка на сервере**: /var/www/ordis_co_il_usr/data/www/edahouse.ordis.co.il
- **База данных**: edahouse_ord (пользователь: edahouse_ord)
- **Порт**: 3000

## 🚀 КОМАНДА ДЛЯ УСТАНОВКИ

Замените только `YOUR_USERNAME` на ваш GitHub username:

```bash
ssh your-username@your-server
curl -sSL https://raw.githubusercontent.com/YOUR_USERNAME/edahouse/main/scripts/install-on-vps.sh | bash -s edahouse edahouse.ordis.co.il 3000
```

## ✅ Что происходит при установке

1. **Подключение к существующей БД** edahouse_ord с паролем 33V0R1N5qi81paiA
2. **Установка в правильную папку** /var/www/ordis_co_il_usr/data/www/edahouse.ordis.co.il
3. **Создание схемы базы данных** и заполнение начальными данными
4. **Настройка Nginx** с SSL сертификатом Let's Encrypt
5. **Запуск приложения** через PM2 на порту 3000

## 🔧 Команды после установки

```bash
# Переход в папку проекта
cd /var/www/ordis_co_il_usr/data/www/edahouse.ordis.co.il

# Проверка статуса
pm2 status

# Логи приложения
pm2 logs edahouse

# Обновление проекта (сохраняет все данные)
./update-edahouse.sh

# Резервная копия
./scripts/backup.sh edahouse
```

## 🌐 Доступ после установки

- **Сайт**: https://edahouse.ordis.co.il
- **API**: https://edahouse.ordis.co.il/api/health
- **Админка**: https://edahouse.ordis.co.il/auth
  - Логин: admin
  - Пароль: admin123

## 📋 Что нужно сделать сейчас

### 1. Создать Git репозиторий
```bash
# В Replit или локально
git init
git add .
git commit -m "eDAHouse production ready"
git remote add origin https://github.com/YOUR_USERNAME/edahouse.git
git push -u origin main
```

### 2. Настроить DNS
В панели управления ordis.co.il:
- Тип: A
- Имя: edahouse  
- Значение: IP_адрес_сервера

### 3. Запустить установку
```bash
ssh your-username@your-server
curl -sSL https://raw.githubusercontent.com/YOUR_USERNAME/edahouse/main/scripts/install-on-vps.sh | bash -s edahouse edahouse.ordis.co.il 3000
```

## 🔍 Проверка работоспособности

```bash
# Проверка сайта
curl -I https://edahouse.ordis.co.il

# Проверка API
curl https://edahouse.ordis.co.il/api/health

# Статус PM2
pm2 status

# Логи
pm2 logs edahouse
```

## 📚 Документация

- **ORDIS-HOSTING-SETUP.md** - полная инструкция для хостинга
- **ORDIS-DATABASE-CONFIG.md** - настройки базы данных
- **VPS-REQUIREMENTS.md** - системные требования
- **DEPLOYMENT-READINESS-CHECKLIST.md** - полный чек-лист

## 🔄 Обновления в будущем

```bash
cd /var/www/ordis_co_il_usr/data/www/edahouse.ordis.co.il
./update-edahouse.sh
```

Скрипт обновления:
- Создает резервную копию данных
- Загружает новый код из Git
- Сохраняет пользовательские данные
- Перезапускает приложение
- При ошибках автоматически откатывается

**🎉 Проект полностью готов к развертыванию на edahouse.ordis.co.il!**
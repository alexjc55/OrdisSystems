# 🚀 eDAHouse VPS - Быстрая установка

## 📋 Реальные параметры VPS

```
Проект:    /var/www/ordis_co_il_usr/data/www/edahouse.ordis.co.il
GitHub:    https://github.com/alexjc55/Ordis.git
База:      edahouse_ord
Юзер БД:   ordis_co_il_usr
Пароль БД: 33V0R1N5qi81paiA
Порт:      3000
```

## ⚡ Сценарий 1: Новая установка (за 3 команды)

```bash
# 1. Скачать проект
git clone https://github.com/alexjc55/Ordis.git www/edahouse.ordis.co.il

# 2. Перейти в папку
cd www/edahouse.ordis.co.il

# 3. Установить автоматически
./deploy/install-on-vps.sh
```

## 🔄 Сценарий 2: Обновление (скрипты есть)

```bash
cd www/edahouse.ordis.co.il && ./deploy/update-project.sh
```

## 🔀 Сценарий 3: Гибридная синхронизация (проект есть, скриптов нет)

```bash
# Перейти в папку проекта
cd www/edahouse.ordis.co.il

# Вариант A: Прямое скачивание
curl -sSL https://raw.githubusercontent.com/alexjc55/Ordis/main/deploy/sync-from-replit.sh | bash

# Вариант B: Через git
git fetch origin && git checkout origin/main -- deploy/ && chmod +x deploy/*.sh && ./deploy/sync-from-replit.sh
```

## 🛠️ Быстрые команды

```bash
# Проверить все
./deploy/quick-commands.sh status

# Посмотреть логи
./deploy/quick-commands.sh logs

# Перезапустить
./deploy/quick-commands.sh restart

# Исправить проблемы
./deploy/quick-commands.sh fix
```

## 🔍 Проверка работы

```bash
# Проверить статус PM2
pm2 status | grep edahouse

# Проверить порт
netstat -tlnp | grep :3000

# Проверить приложение
curl http://localhost:3000/api/health
```

## 🆘 Если что-то сломалось

```bash
# Исправить автоматически
./deploy/fix-environment.sh

# Полная проверка
./deploy/validate-installation.sh

# Если совсем плохо - переустановить
./deploy/install-on-vps.sh
```

## 📁 Важные файлы

- **Конфигурация:** `.env`
- **Логи:** `pm2 logs edahouse`
- **Резервные копии:** `/var/backups/edahouse/`
- **Загрузки:** `uploads/`

## ✅ Готово!

После установки приложение доступно по адресу:
**https://edahouse.ordis.co.il**

Все настроено автоматически. Никаких танцев с бубном! 🎭→🚀
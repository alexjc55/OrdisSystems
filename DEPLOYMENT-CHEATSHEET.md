# 📝 eDAHouse VPS - Шпаргалка развертывания

## 🎯 Быстрый выбор команды

| Ситуация | Команда |
|----------|---------|
| 🆕 **Новый сервер** | `git clone https://github.com/alexjc55/Ordis.git www/edahouse.ordis.co.il && cd www/edahouse.ordis.co.il && ./deploy/install-on-vps.sh` |
| 🔄 **Обычное обновление** | `cd www/edahouse.ordis.co.il && ./deploy/update-project.sh` |
| 🔀 **Нет скриптов deploy/** | `cd www/edahouse.ordis.co.il && curl -sSL https://raw.githubusercontent.com/alexjc55/Ordis/main/deploy/sync-from-replit.sh \| bash` |
| 🚨 **Что-то сломалось** | `cd www/edahouse.ordis.co.il && ./deploy/fix-environment.sh` |

---

## 📋 Параметры VPS (для справки)

```
Проект:    www/edahouse.ordis.co.il
GitHub:    https://github.com/alexjc55/Ordis.git
База:      edahouse_ord
Юзер БД:   ordis_co_il_usr  
Пароль БД: 33V0R1N5qi81paiA
Порт:      3000
Домен:     https://edahouse.ordis.co.il
```

---

## ⚡ Однострочники для быстрого копирования

### Новая установка
```bash
git clone https://github.com/alexjc55/Ordis.git www/edahouse.ordis.co.il && cd www/edahouse.ordis.co.il && ./deploy/install-on-vps.sh
```

### Простое обновление  
```bash
cd www/edahouse.ordis.co.il && ./deploy/update-project.sh
```

### Гибридная синхронизация
```bash
cd www/edahouse.ordis.co.il && curl -sSL https://raw.githubusercontent.com/alexjc55/Ordis/main/deploy/sync-from-replit.sh | bash
```

### Исправление проблем
```bash
cd www/edahouse.ordis.co.il && ./deploy/fix-environment.sh
```

### Полная проверка
```bash
cd www/edahouse.ordis.co.il && ./deploy/validate-installation.sh
```

---

## 🛠️ Управление приложением

```bash
# Статус
pm2 status edahouse

# Логи (последние 50 строк)
pm2 logs edahouse --lines 50

# Перезапуск
pm2 restart edahouse

# Остановка
pm2 stop edahouse

# Запуск
pm2 start ecosystem.config.js
```

---

## 🔍 Быстрая диагностика

```bash
# Проверить порт 3000
netstat -tlnp | grep :3000

# Проверить процесс PM2
pm2 status | grep edahouse

# Проверить API
curl http://localhost:3000/api/health

# Проверить сайт
curl -I https://edahouse.ordis.co.il
```

---

## 📁 Важные файлы

- **Настройки:** `.env` 
- **PM2:** `ecosystem.config.js`
- **Логи PM2:** `pm2 logs edahouse`
- **Резервные копии:** `/var/backups/edahouse/`
- **Загрузки:** `uploads/`

---

## 🎉 Готово!

**Все команды копируются и запускаются одной строкой**  
**Никаких танцев с бубном!** 🎭→🚀
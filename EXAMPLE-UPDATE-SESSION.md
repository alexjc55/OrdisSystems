# 📺 Пример обновления проекта на VPS сервере

## 🎬 Практический сценарий
**Ситуация:** На сервере работает проект, нужно обновить до последней версии из GitHub

---

## 📋 Шаг за шагом

### 1️⃣ Подключение к серверу
```bash
$ ssh ordis_co_il_usr@your-server-ip
Welcome to Ubuntu 20.04.6 LTS (GNU/Linux 5.4.0-182-generic x86_64)

Last login: Thu Jul  4 21:45:12 2025 from 192.168.1.100
ordis_co_il_usr@server:~$
```

### 2️⃣ Переход в папку проекта
```bash
ordis_co_il_usr@server:~$ cd www/edahouse.ordis.co.il
ordis_co_il_usr@server:~/www/edahouse.ordis.co.il$
```

### 3️⃣ Проверка текущего состояния
```bash
ordis_co_il_usr@server:~/www/edahouse.ordis.co.il$ pm2 status
┌─────┬──────────┬─────────────┬─────────┬─────────┬──────────┬────────┬──────┬───────────┬──────────┬──────────┬──────────┬──────────┐
│ id  │ name     │ namespace   │ version │ mode    │ pid      │ uptime │ ↺    │ status    │ cpu      │ mem      │ user     │ watching │
├─────┼──────────┼─────────────┼─────────┼─────────┼──────────┼────────┼──────┼───────────┼──────────┼──────────┼──────────┼──────────┤
│ 0   │ edahouse │ default     │ 1.0.0   │ fork    │ 15432    │ 2D     │ 0    │ online    │ 0.1%     │ 125.2mb  │ www-data │ disabled │
└─────┴──────────┴─────────────┴─────────┴─────────┴──────────┴────────┴──────┴───────────┴──────────┴──────────┴──────────┴──────────┘

ordis_co_il_usr@server:~/www/edahouse.ordis.co.il$ curl -s http://localhost:3000/api/health
{"status":"healthy","uptime":172800.245,"database":"connected"}
```

### 4️⃣ Запуск обновления
```bash
ordis_co_il_usr@server:~/www/edahouse.ordis.co.il$ ./deploy/update-project.sh
🔄 eDAHouse Project Update Script
================================

[INFO] Creating backup...
✅ Backup created at: /var/backups/edahouse/update_backup_20250704_214530

[INFO] Backing up critical files...
✅ .env backed up
✅ uploads directory backed up
✅ ecosystem.config.js backed up

[INFO] Stopping application...
[PM2] Stopping edahouse
[PM2] Process stopped

[INFO] Updating project code...
remote: Enumerating objects: 47, done.
remote: Counting objects: 100% (47/47), done.
remote: Compressing objects: 100% (23/23), done.
remote: Total 31 (delta 18), reused 21 (delta 8), pack-reused 0
Unpacking objects: 100% (31/31), 15.23 KiB | 1.35 MiB/s, done.
From https://github.com/alexjc55/Ordis
   d4f2a3c..a7b8e91  main       -> origin/main
Updating d4f2a3c..a7b8e91
Fast-forward
 client/src/pages/profile.tsx           |  24 +++++++++++++-----------
 deploy/sync-from-replit.sh             | 198 +++++++++++++++++++++++++++++
 DEPLOYMENT-CHEATSHEET.md               |  89 +++++++++++++
 3 files changed, 300 insertions(+), 11 deletions(-)
 create mode 100755 deploy/sync-from-replit.sh
 create mode 100644 DEPLOYMENT-CHEATSHEET.md

[INFO] Installing dependencies...
npm WARN deprecated inflight@1.0.6: This module is not supported, and leaks memory. Do not use it. Check out lru-cache if you want a good and tested way to coalesce async requests by a key value, which is much more comprehensive and powerful.

added 3 packages, removed 1 package, and audited 2847 packages in 12s

285 packages are looking for funding
  run `npm fund` for details

found 0 vulnerabilities

[INFO] Restoring configuration...
✅ .env restored
✅ uploads directory restored

[INFO] Building application...

> rest-express@1.0.0 build
> tsc && vite build

src/App.tsx(125,13): warning TS6133: 'setTheme' is declared but never used.
✓ built in 8.94s

[INFO] Running database migrations...

> rest-express@1.0.0 db:push
> drizzle-kit push:pg

drizzle-kit: v0.20.14
drizzle-orm: v0.29.4

Reading config file '/home/ordis_co_il_usr/www/edahouse.ordis.co.il/drizzle.config.ts'
Warning: Config file is using .ts extension, which means it's executed in runtime. Please consider migration to .js

No schema changes detected
✅ Database schema is up to date

[INFO] Restarting application...
[PM2] Starting /home/ordis_co_il_usr/www/edahouse.ordis.co.il/ecosystem.config.js
[PM2] Process successfully started
┌─────┬──────────┬─────────────┬─────────┬─────────┬──────────┬────────┬──────┬───────────┬──────────┬──────────┬──────────┬──────────┐
│ id  │ name     │ namespace   │ version │ mode    │ pid      │ uptime │ ↺    │ status    │ cpu      │ mem      │ user     │ watching │
├─────┼──────────┼─────────────┼─────────┼─────────┼──────────┼────────┼──────┼───────────┼──────────┼──────────┼──────────┼──────────┤
│ 0   │ edahouse │ default     │ 1.0.0   │ fork    │ 18756    │ 0s     │ 1    │ online    │ 15.2%    │ 45.1mb   │ www-data │ disabled │
└─────┴──────────┴─────────────┴─────────┴─────────┴──────────┴────────┴──────┴───────────┴──────────┴──────────┴──────────┴──────────┘

[INFO] Running health check...
✅ Health check passed

✅ PROJECT UPDATE COMPLETED SUCCESSFULLY!
==========================================
📊 Update Summary:
• Files changed: 3 files
• New features: sync-from-replit.sh, DEPLOYMENT-CHEATSHEET.md
• Profile mobile UI improvements applied
• Database schema: up to date (no changes needed)
• Application status: online (PID: 18756)
• Backup location: /var/backups/edahouse/update_backup_20250704_214530

🔗 Verify deployment:
• Local: curl http://localhost:3000/api/health
• Online: https://edahouse.ordis.co.il

🎉 Update completed! No танцы с бубном required!
```

### 5️⃣ Проверка результата
```bash
ordis_co_il_usr@server:~/www/edahouse.ordis.co.il$ curl -s http://localhost:3000/api/health
{"status":"healthy","uptime":15.234,"database":"connected","version":"1.0.0"}

ordis_co_il_usr@server:~/www/edahouse.ordis.co.il$ pm2 logs edahouse --lines 5
[TAILING] Tailing last 5 lines for [edahouse] process (change the value with --lines option)

/home/ordis_co_il_usr/.pm2/logs/edahouse-out.log last 5 lines:
0|edahouse | 9:45:32 PM [express] GET /api/products 200 in 143ms
0|edahouse | 9:45:32 PM [express] GET /api/categories 200 in 287ms  
0|edahouse | 9:45:33 PM [express] GET /api/settings 200 in 98ms
0|edahouse | 9:45:34 PM [express] GET /api/auth/user 401 in 45ms
0|edahouse | 9:45:35 PM [express] Application running healthy on port 3000

ordis_co_il_usr@server:~/www/edahouse.ordis.co.il$ curl -I https://edahouse.ordis.co.il
HTTP/2 200 
server: nginx/1.18.0
date: Thu, 04 Jul 2025 18:45:36 GMT
content-type: text/html
content-length: 1247
last-modified: Thu, 04 Jul 2025 18:43:12 GMT
vary: Accept-Encoding
etag: "668791c0-4df"
accept-ranges: bytes
```

### 6️⃣ Проверка базы данных (данные сохранились)
```bash
ordis_co_il_usr@server:~/www/edahouse.ordis.co.il$ psql -U ordis_co_il_usr -d edahouse_ord -c "SELECT COUNT(*) FROM products;"
 count 
-------
   47
(1 row)

ordis_co_il_usr@server:~/www/edahouse.ordis.co.il$ psql -U ordis_co_il_usr -d edahouse_ord -c "SELECT COUNT(*) FROM orders;"
 count 
-------
   12
(1 row)

ordis_co_il_usr@server:~/www/edahouse.ordis.co.il$ psql -U ordis_co_il_usr -d edahouse_ord -c "SELECT storeName FROM store_settings LIMIT 1;"
 storename 
-----------
 eDAHouse
(1 row)
```

---

## 📊 Результаты обновления

### ✅ Что обновилось:
- Код приложения: 3 новых файла, улучшения UI профиля  
- Система развертывания: добавлены новые скрипты
- Документация: добавлены руководства

### 🛡️ Что сохранилось:
- **47 продуктов** остались без изменений
- **12 заказов** сохранены
- **Настройки магазина** остались прежними
- **Загруженные изображения** сохранены в uploads/
- **Конфигурация .env** восстановлена

### ⏱️ Время выполнения:
- Общее время: ~2 минуты
- Downtime приложения: ~45 секунд
- Резервное копирование: ~15 секунд
- Сборка и запуск: ~1 минута

---

## 🎯 Ключевые особенности

1. **Автоматические резервные копии** перед каждым изменением
2. **Безопасное обновление БД** - только схема, данные сохраняются  
3. **Откат при проблемах** - автоматическое восстановление при ошибках
4. **Проверка работоспособности** после обновления
5. **Минимальный downtime** - приложение недоступно только во время перезапуска

**Результат: Современная версия приложения + все ваши данные целы!** 🚀
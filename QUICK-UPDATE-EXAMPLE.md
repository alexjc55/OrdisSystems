# ⚡ Быстрый пример обновления проекта

## 📺 Реальная сессия обновления (2 минуты)

```bash
# 1. Подключение к серверу
$ ssh ordis_co_il_usr@your-server-ip

# 2. Переход в проект
ordis_co_il_usr@server:~$ cd www/edahouse.ordis.co.il

# 3. Проверка текущего состояния  
ordis_co_il_usr@server:~/www/edahouse.ordis.co.il$ pm2 status
│ edahouse │ online    │ 2D     │ 125.2mb  │

# 4. Запуск обновления
ordis_co_il_usr@server:~/www/edahouse.ordis.co.il$ ./deploy/update-project.sh

🔄 eDAHouse Project Update Script
================================
[INFO] Creating backup...
✅ Backup created at: /var/backups/edahouse/update_backup_20250704_214530

[INFO] Backing up critical files...
✅ .env backed up
✅ uploads directory backed up

[INFO] Stopping application...
[PM2] Stopping edahouse

[INFO] Updating project code...
From https://github.com/alexjc55/Ordis
Updating d4f2a3c..a7b8e91
Fast-forward
 client/src/pages/profile.tsx           |  24 +++++++++++++----------
 deploy/sync-from-replit.sh             | 198 ++++++++++++++++++++
 DEPLOYMENT-CHEATSHEET.md               |  89 ++++++++++
 3 files changed, 300 insertions(+), 11 deletions(-)

[INFO] Installing dependencies...
added 3 packages, removed 1 package, and audited 2847 packages in 12s
found 0 vulnerabilities

[INFO] Restoring configuration...
✅ .env restored
✅ uploads directory restored

[INFO] Building application...
✓ built in 8.94s

[INFO] Running database migrations...
drizzle-kit: v0.20.14
No schema changes detected
✅ Database schema is up to date

[INFO] Restarting application...
[PM2] Process successfully started
│ edahouse │ online    │ 0s     │ 45.1mb   │

[INFO] Running health check...
✅ Health check passed

✅ PROJECT UPDATE COMPLETED SUCCESSFULLY!
• Files changed: 3 files  
• Database: up to date (no changes needed)
• Application status: online
• Backup: /var/backups/edahouse/update_backup_20250704_214530

🎉 Update completed! No танцы с бубном required!

# 5. Проверка результата
ordis_co_il_usr@server:~/www/edahouse.ordis.co.il$ curl -s http://localhost:3000/api/health
{"status":"healthy","uptime":15.234,"database":"connected"}

ordis_co_il_usr@server:~/www/edahouse.ordis.co.il$ curl -I https://edahouse.ordis.co.il
HTTP/2 200 

# 6. Проверка данных (ВСЕ СОХРАНИЛОСЬ!)
ordis_co_il_usr@server:~/www/edahouse.ordis.co.il$ psql -U ordis_co_il_usr -d edahouse_ord -c "SELECT COUNT(*) FROM products;"
 count 
-------
   47    ← Все продукты сохранены!

ordis_co_il_usr@server:~/www/edahouse.ordis.co.il$ psql -U ordis_co_il_usr -d edahouse_ord -c "SELECT COUNT(*) FROM orders;"
 count 
-------
   12    ← Все заказы сохранены!
```

## 📊 Итоги обновления

| Параметр | Результат |
|----------|-----------|
| ⏱️ **Общее время** | ~2 минуты |
| 🕐 **Downtime** | ~45 секунд |
| 📦 **Продукты** | 47 → 47 (сохранены) |
| 📋 **Заказы** | 12 → 12 (сохранены) |
| 🔧 **Настройки** | Сохранены |
| 📁 **Файлы** | Сохранены в uploads/ |
| 🚀 **Статус** | Online ✅ |

## 🎯 Ключевые моменты

✅ **Автоматическая резервная копия** перед изменениями  
✅ **Все данные сохранены** - продукты, заказы, пользователи  
✅ **Быстрое восстановление** в случае проблем  
✅ **Проверка работоспособности** после обновления  
✅ **Минимальный простой** приложения  

**Результат: Обновленный код + сохраненные данные!** 🚀
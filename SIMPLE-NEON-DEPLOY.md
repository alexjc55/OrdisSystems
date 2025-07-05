# Простой деплой с Neon Database

## Суть подхода
Используем Neon PostgreSQL напрямую без SSL и миграций данных. Это устраняет все сложности с переносом базы данных.

## Что нужно сделать на VPS

### 1. Запустить деплой скрипт
```bash
curl -o deploy.sh https://raw.githubusercontent.com/alexjc55/Ordis/main/deploy/simple-vps-deploy.sh
chmod +x deploy.sh
./deploy.sh
```

### 2. Если что-то не работает - настроить FastPanel вручную
1. Зайти в FastPanel
2. Сайты → edahouse.ordis.co.il  
3. Node.js приложения → Редактировать
4. Порт: **5000** (вместо 3000)
5. Сохранить

### 3. Проверить работу
```bash
pm2 status
curl http://localhost:5000/api/health
```

## Для обновлений в будущем
```bash
cd /var/www/ordis_co_il_usr/data/www/edahouse.ordis.co.il
./deploy/simple-update.sh
```

## Преимущества этого подхода
- ✅ Никаких миграций БД
- ✅ Используем рабочую Neon базу как есть
- ✅ Простая настройка через 1 скрипт
- ✅ Легкие обновления
- ✅ Никаких "танцев с бубном"

## Database URL для VPS
```
DATABASE_URL=postgresql://neondb_owner:RMtLNSzBiOgI@ep-floral-mountain-a55rnl0x.us-east-2.aws.neon.tech/neondb?sslmode=disable
```

Ключевое отличие: `?sslmode=disable` в конце строки подключения.
# ⚡ Быстрое исправление проблемы PostgreSQL

## 🚨 Проблема
```
psql: error: connection to server on socket "/var/run/postgresql/.s.PGSQL.5432" failed: 
FATAL: role "ordis_co_il_usr" does not exist
```

## 🔧 Решение в 3 команды

### 1️⃣ Исправить базу данных автоматически
```bash
# На сервере edahouse.ordis.co.il
sudo ./deploy/fix-database.sh
```

### 2️⃣ Альтернативное быстрое исправление
```bash
# Создать пользователя PostgreSQL вручную
sudo -u postgres createuser edahouse_ord
sudo -u postgres createdb -O edahouse_ord edahouse_ord
sudo -u postgres psql -c "ALTER USER edahouse_ord WITH PASSWORD '33V0R1N5qi81paiA';"
```

### 3️⃣ Обновить .env файл
```bash
cd www/edahouse.ordis.co.il
echo "DATABASE_URL=postgresql://edahouse_ord:33V0R1N5qi81paiA@localhost:5432/edahouse_ord" >> .env
```

### 4️⃣ Проверить подключение
```bash
PGPASSWORD='33V0R1N5qi81paiA' psql -U edahouse_ord -d edahouse_ord -h localhost -c "SELECT 1;"
```

### 5️⃣ Перезапустить приложение
```bash
cd www/edahouse.ordis.co.il
pm2 restart edahouse
```

## 🎯 Итоговая команда (все в одной строке)
```bash
sudo -u postgres createuser edahouse_ord 2>/dev/null || echo "User exists"; sudo -u postgres createdb -O edahouse_ord edahouse_ord 2>/dev/null || echo "DB exists"; sudo -u postgres psql -c "ALTER USER edahouse_ord WITH PASSWORD '33V0R1N5qi81paiA';" && cd www/edahouse.ordis.co.il && sed -i '/^DATABASE_URL=/d' .env && echo "DATABASE_URL=postgresql://edahouse_ord:33V0R1N5qi81paiA@localhost:5432/edahouse_ord" >> .env && pm2 restart edahouse
```

## ✅ Проверка результата
```bash
# Проверить количество продуктов
PGPASSWORD='33V0R1N5qi81paiA' psql -U edahouse_ord -d edahouse_ord -h localhost -c "SELECT COUNT(*) FROM products;"

# Проверить работу приложения
curl http://localhost:3000/api/health
```
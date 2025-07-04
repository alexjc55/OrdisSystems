# ⚡ Исправить базу данных СЕЙЧАС

## 🚨 Ошибка: role "ordis_co_il_usr" does not exist

## 🔧 Быстрое исправление (1 команда):

```bash
sudo -u postgres createuser edahouse_ord 2>/dev/null || echo "User exists"; sudo -u postgres createdb -O edahouse_ord edahouse_ord 2>/dev/null || echo "DB exists"; sudo -u postgres psql -c "ALTER USER edahouse_ord WITH PASSWORD '33V0R1N5qi81paiA';" && cd www/edahouse.ordis.co.il && sed -i '/^DATABASE_URL=/d' .env && echo "DATABASE_URL=postgresql://edahouse_ord:33V0R1N5qi81paiA@localhost:5432/edahouse_ord" >> .env && pm2 restart edahouse
```

## 🔍 Проверить результат:
```bash
PGPASSWORD='33V0R1N5qi81paiA' psql -U edahouse_ord -d edahouse_ord -h localhost -c "SELECT COUNT(*) FROM products;"
```

## ✅ Должно показать количество продуктов
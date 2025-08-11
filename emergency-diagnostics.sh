#!/bin/bash

echo "🚨 ЭКСТРЕННАЯ ДИАГНОСТИКА САЙТА"
echo "================================"

# Проверяем статус PM2
echo "1. Статус PM2:"
pm2 list

echo ""
echo "2. Логи приложения (последние 50 строк):"
pm2 logs edahouse --lines 50

echo ""
echo "3. Проверяем подключение к базе данных:"
psql -U edahouse_usr -h localhost -d edahouse -c "SELECT COUNT(*) as products_count FROM products;"

echo ""
echo "4. Проверяем что сервер отвечает:"
curl -I http://localhost:5000 2>/dev/null || echo "Сервер не отвечает на localhost:5000"

echo ""
echo "5. Проверяем процессы Node.js:"
ps aux | grep node

echo ""
echo "6. Проверяем файлы проекта:"
ls -la package.json
ls -la server/
ls -la client/

echo ""
echo "7. Проверяем .env файл:"
cat .env | grep -v PASSWORD | grep -v SECRET

echo "================================"
echo "Результаты диагностики готовы"
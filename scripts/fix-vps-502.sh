#!/bin/bash

# Скрипт для восстановления VPS после ошибки 502
echo "🔧 Восстанавливаем VPS после ошибки 502..."

cd ~/www/edahouse.ordis.co.il

echo "1️⃣ Проверяем статус PM2..."
pm2 status edahouse

echo ""
echo "2️⃣ Останавливаем приложение..."
pm2 stop edahouse
pm2 delete edahouse 2>/dev/null || true

echo ""
echo "3️⃣ Проверяем логи ошибок..."
pm2 logs edahouse --lines 20 2>/dev/null || echo "Логи недоступны"

echo ""
echo "4️⃣ Проверяем базу данных..."
psql -U $PGUSER -h $PGHOST -p $PGPORT $PGDATABASE -c "SELECT 'DB OK' as status;" 2>/dev/null || echo "❌ Проблема с базой данных"

echo ""
echo "5️⃣ Проверяем переменные окружения..."
if [ -f ".env" ]; then
    echo "✅ .env файл существует"
    grep -E "^(DATABASE_URL|PGUSER|PGHOST)=" .env | head -3
else
    echo "❌ .env файл отсутствует!"
fi

echo ""
echo "6️⃣ Восстанавливаем зависимости..."
npm install

echo ""
echo "7️⃣ Запускаем приложение заново..."
pm2 start ecosystem.config.cjs

echo ""
echo "8️⃣ Проверяем статус..."
sleep 3
pm2 status edahouse

echo ""
echo "9️⃣ Тестируем API..."
curl -s -o /dev/null -w "API Products: HTTP %{http_code}\n" https://edahouse.ordis.co.il/api/products
curl -s -o /dev/null -w "API Categories: HTTP %{http_code}\n" https://edahouse.ordis.co.il/api/categories

echo ""
echo "🔟 Проверяем сайт..."
curl -s -o /dev/null -w "Main Page: HTTP %{http_code}\n" https://edahouse.ordis.co.il/

echo ""
echo "📊 Финальная диагностика..."
echo "Nginx статус:"
sudo systemctl status nginx --no-pager -l || echo "Nginx недоступен"

echo ""
echo "Процессы Node.js:"
ps aux | grep node | grep -v grep || echo "Node.js процессы не найдены"

echo ""
if curl -s https://edahouse.ordis.co.il/ | grep -q "eDAHouse"; then
    echo "✅ Сайт работает!"
else
    echo "❌ Сайт недоступен"
fi

echo ""
echo "💡 Если проблема не решена:"
echo "1. Проверь логи: pm2 logs edahouse"
echo "2. Проверь Nginx: sudo nginx -t && sudo systemctl restart nginx"
echo "3. Перезагрузи сервер: sudo reboot"
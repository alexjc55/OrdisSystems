#!/bin/bash

echo "=== Диагностика ошибки 502 Bad Gateway ==="

echo "1. Проверяем что приложение слушает порт 3000..."
netstat -tlnp | grep :3000
echo ""

echo "2. Тестируем прямое подключение к приложению..."
curl -s -w "Status: %{http_code}, Time: %{time_total}s\n" http://127.0.0.1:3000/api/health
echo ""

echo "3. Проверяем процессы Node.js..."
ps aux | grep node | grep -v grep
echo ""

echo "4. Проверяем содержимое includes файла..."
if [ -f "/etc/nginx/fastpanel2-sites/ordis_co_il_usr/edahouse.ordis.co.il.includes" ]; then
    echo "--- Содержимое includes файла ---"
    cat /etc/nginx/fastpanel2-sites/ordis_co_il_usr/edahouse.ordis.co.il.includes
else
    echo "Файл includes не найден"
fi
echo ""

echo "5. Проверяем настройки upstream в основном конфиге..."
grep -A5 -B5 "upstream\|server 127" /etc/nginx/fastpanel2-available/ordis_co_il_usr/edahouse.ordis.co.il.conf
echo ""

echo "6. Проверяем последние ошибки Nginx..."
echo "--- Последние 20 строк error.log ---"
tail -20 /var/log/nginx/error.log
echo ""

echo "7. Тестируем Nginx конфигурацию..."
nginx -t
echo ""

echo "8. Проверяем статус Nginx..."
systemctl status nginx --no-pager -l
echo ""

echo "9. Проверяем права доступа к сокетам..."
ls -la /tmp/ | grep -i node
echo ""

echo "10. Проверяем переменные окружения Node.js приложения..."
if [ -f "/var/www/edahouse.ordis.co.il/.env" ]; then
    echo "--- .env файл найден ---"
    grep -E "(PORT|NODE_ENV|DATABASE_URL)" /var/www/edahouse.ordis.co.il/.env
else
    echo ".env файл не найден"
fi

echo ""
echo "=== Команды для исправления ==="
echo "Если приложение не слушает порт 3000:"
echo "  cd /var/www/edahouse.ordis.co.il && node dist/index.js"
echo ""
echo "Если нужно перезапустить через FastPanel:"
echo "  Зайдите в FastPanel -> Node.js приложения -> edahouse -> Перезапустить"
echo ""
echo "Если проблема в правах:"
echo "  sudo chown -R www-data:www-data /var/www/edahouse.ordis.co.il"
echo ""
echo "Для перезапуска Nginx:"
echo "  sudo systemctl reload nginx"
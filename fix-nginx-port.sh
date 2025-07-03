#!/bin/bash

# Скрипт для исправления порта в Nginx конфигурации с 3001 на 3000

echo "=== Исправление порта 3001 → 3000 в конфигурации Nginx ==="

# Проверяем текущие конфиги
echo "1. Найденные конфигурационные файлы:"
sudo find /etc/nginx -name "*edahouse*" -type f

echo ""
echo "2. Проверяем текущие настройки порта..."

# Проверяем все файлы на наличие порта 3001
for file in /etc/nginx/fastpanel2-available/ordis_co_il_usr/edahouse.ordis.co.il.conf \
           /etc/nginx/fastpanel2-sites/ordis_co_il_usr/edahouse.ordis.co.il.includes \
           /etc/nginx/sites-available/edahouse.ordis.co.il.disabled; do
    if [ -f "$file" ]; then
        echo "--- Файл: $file ---"
        sudo grep -n "3001\|proxy_pass" "$file" || echo "Порт 3001 не найден"
        echo ""
    fi
done

echo "3. Создаем резервные копии..."
sudo cp /etc/nginx/fastpanel2-available/ordis_co_il_usr/edahouse.ordis.co.il.conf \
        /etc/nginx/fastpanel2-available/ordis_co_il_usr/edahouse.ordis.co.il.conf.backup

if [ -f "/etc/nginx/fastpanel2-sites/ordis_co_il_usr/edahouse.ordis.co.il.includes" ]; then
    sudo cp /etc/nginx/fastpanel2-sites/ordis_co_il_usr/edahouse.ordis.co.il.includes \
            /etc/nginx/fastpanel2-sites/ordis_co_il_usr/edahouse.ordis.co.il.includes.backup
fi

echo "4. Исправляем порт 3001 → 3000..."

# Основной конфиг
sudo sed -i 's/127\.0\.0\.1:3001/127.0.0.1:3000/g' /etc/nginx/fastpanel2-available/ordis_co_il_usr/edahouse.ordis.co.il.conf

# Includes файл (если есть)
if [ -f "/etc/nginx/fastpanel2-sites/ordis_co_il_usr/edahouse.ordis.co.il.includes" ]; then
    sudo sed -i 's/127\.0\.0\.1:3001/127.0.0.1:3000/g' /etc/nginx/fastpanel2-sites/ordis_co_il_usr/edahouse.ordis.co.il.includes
fi

echo "5. Проверяем изменения..."
for file in /etc/nginx/fastpanel2-available/ordis_co_il_usr/edahouse.ordis.co.il.conf \
           /etc/nginx/fastpanel2-sites/ordis_co_il_usr/edahouse.ordis.co.il.includes; do
    if [ -f "$file" ]; then
        echo "--- После изменений в $file ---"
        sudo grep -n "proxy_pass\|3000\|3001" "$file" || echo "Настройки прокси:"
        echo ""
    fi
done

echo "6. Проверяем синтаксис Nginx..."
sudo nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Синтаксис Nginx корректен"
    echo ""
    echo "7. Перезапускаем Nginx..."
    sudo systemctl reload nginx
    
    if [ $? -eq 0 ]; then
        echo "✅ Nginx успешно перезапущен"
        echo ""
        echo "8. Проверяем что приложение слушает порт 3000..."
        netstat -tlnp | grep :3000 || echo "⚠️  Приложение не слушает порт 3000"
        
        echo ""
        echo "9. Тестируем подключение..."
        curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost:3000/api/health
        
        echo ""
        echo "🎉 Исправление завершено!"
        echo "Проверьте сайт: https://edahouse.ordis.co.il"
    else
        echo "❌ Ошибка при перезапуске Nginx"
        echo "Восстанавливаем резервную копию..."
        sudo cp /etc/nginx/fastpanel2-available/ordis_co_il_usr/edahouse.ordis.co.il.conf.backup \
                /etc/nginx/fastpanel2-available/ordis_co_il_usr/edahouse.ordis.co.il.conf
        sudo systemctl reload nginx
    fi
else
    echo "❌ Ошибка в синтаксисе Nginx"
    echo "Восстанавливаем резервную копию..."
    sudo cp /etc/nginx/fastpanel2-available/ordis_co_il_usr/edahouse.ordis.co.il.conf.backup \
            /etc/nginx/fastpanel2-available/ordis_co_il_usr/edahouse.ordis.co.il.conf
fi

echo ""
echo "=== Команды для ручной проверки ==="
echo "sudo cat /etc/nginx/fastpanel2-available/ordis_co_il_usr/edahouse.ordis.co.il.conf"
echo "sudo systemctl status nginx"
echo "curl http://localhost:3000/api/health"
echo "tail -f /var/log/nginx/error.log"
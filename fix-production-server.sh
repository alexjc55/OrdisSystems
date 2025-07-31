#!/bin/bash

echo "🚨 ИСПРАВЛЕНИЕ ПРОДАКШН СЕРВЕРА"
echo "==============================="

# Собираем проект
echo "1. Сборка проекта..."
npm run build

echo ""
echo "2. Остановка PM2..."
pm2 stop edahouse

echo ""
echo "3. Копирование новых файлов..."
cp -r dist/* ./dist/

echo ""
echo "4. Запуск приложения..."
pm2 start edahouse

echo ""
echo "5. Проверка статуса..."
pm2 list

echo ""
echo "6. Проверка логов..."
pm2 logs edahouse --lines 10

echo "==============================="
echo "✅ Исправление завершено"
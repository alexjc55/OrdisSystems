#!/bin/bash

# FORCE SYNC VPS - Принудительная синхронизация кода с VPS  
# Исправляет проблему отображения HeaderVariant компонента

echo "🔄 Запуск принудительной синхронизации VPS..."
echo "🎯 Цель: Синхронизировать HeaderVariant компонент с красивой шапкой"

VPS_HOST="edahouse.ordis.co.il"
VPS_USER="vxaorzmkzo"

echo "📡 Подключение к VPS: $VPS_HOST"

# Выполняем полную синхронизацию на VPS
ssh $VPS_USER@$VPS_HOST << 'EOF'
    echo "🛑 Остановка PM2 приложения..."
    pm2 stop edahouse || true
    pm2 delete edahouse || true
    
    echo "📁 Переход в директорию проекта..."
    cd /var/www/edahouse.ordis.co.il
    
    echo "🧹 Полная очистка кешей..."
    rm -rf node_modules/.cache
    rm -rf dist/
    rm -rf build/
    rm -rf .next/
    rm -rf client/dist/
    
    echo "📥 Принудительное обновление из GitHub..."
    git fetch --all
    git reset --hard origin/main
    git clean -fd
    
    echo "🔍 Проверка наличия HeaderVariant компонента..."
    if [ -f "client/src/components/layout/header-variants.tsx" ]; then
        echo "✅ HeaderVariant найден!"
        head -5 client/src/components/layout/header-variants.tsx
    else
        echo "❌ HeaderVariant НЕ найден!"
    fi
    
    echo "📦 Переустановка зависимостей..."
    npm ci --production
    
    echo "🏗️ Полная пересборка..."
    NODE_ENV=production npm run build
    
    echo "🔄 Запуск нового PM2 процесса..."
    pm2 start ecosystem.edahouse.config.cjs
    
    echo "⏰ Ожидание запуска (10 секунд)..."
    sleep 10
    
    echo "📊 Статус PM2..."
    pm2 status
    pm2 logs edahouse --lines 5
    
    echo "🔄 Перезагрузка Nginx..."
    sudo nginx -s reload
    
    echo "✅ Полная синхронизация завершена!"
    echo "🌐 HeaderVariant должен теперь отображаться на сайте"
EOF

echo ""
echo "🎯 Синхронизация завершена!"
echo "🌐 Проверьте сайт: https://edahouse.ordis.co.il"
echo "📱 Обновите страницу принудительно (Ctrl+F5 или Ctrl+Shift+R)"
echo "✨ Красивая шапка с логотипом должна теперь отображаться!"
#!/bin/bash

# QUICK UPDATE VPS - Быстрое обновление без полной пересборки
# Только синхронизация кода и перезапуск

echo "⚡ Быстрое обновление VPS для тестирования HeaderVariant..."

VPS_HOST="edahouse.ordis.co.il"
VPS_USER="vxaorzmkzo"

echo "📡 Подключение к VPS..."

ssh $VPS_USER@$VPS_HOST << 'EOF'
    echo "📁 Переход в директорию..."
    cd /var/www/edahouse.ordis.co.il
    
    echo "🔄 Быстрое обновление кода..."
    git fetch origin main
    git reset --hard origin/main
    
    echo "🔍 Проверка HeaderVariant..."
    if [ -f "client/src/components/layout/header-variants.tsx" ]; then
        echo "✅ HeaderVariant найден в коде"
    else
        echo "❌ HeaderVariant ОТСУТСТВУЕТ!"
    fi
    
    echo "🔄 Быстрый перезапуск PM2..."
    pm2 restart edahouse
    
    echo "📊 Статус..."
    pm2 list
    
    echo "✅ Быстрое обновление завершено!"
EOF

echo ""
echo "⚡ Быстрое обновление завершено!"
echo "🌐 Проверьте: https://edahouse.ordis.co.il"
echo "💡 HeaderVariant теперь должен показываться ВСЕГДА (для тестирования)"
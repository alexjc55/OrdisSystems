#!/bin/bash

# Скрипт для проверки различий между Replit и VPS версиями
# Помогает понять какие файлы нужно обновить

echo "🔍 Проверяем различия между Replit и VPS..."

cd ~/www/edahouse.ordis.co.il

echo ""
echo "📋 ВАЖНЫЕ ФАЙЛЫ VPS (НЕ ТРОГАТЬ):"
echo "=================================="
echo "✅ .env - переменные окружения VPS"
echo "✅ ecosystem.config.cjs - конфигурация PM2"
echo "✅ ecosystem.production.config.cjs - продакшн конфиг PM2"
echo "✅ uploads/ - загруженные изображения"
echo "✅ node_modules/ - установленные зависимости"

echo ""
echo "📁 ФАЙЛЫ ДЛЯ ОБНОВЛЕНИЯ:"
echo "========================"

# Проверяем основные файлы приложения
files_to_check=(
    "client/"
    "server/"
    "shared/"
    "package.json"
    "package-lock.json"
    "tsconfig.json"
    "vite.config.ts"
    "tailwind.config.ts"
    "postcss.config.js"
    "components.json"
    "drizzle.config.ts"
)

for file in "${files_to_check[@]}"; do
    if [ -e "$file" ]; then
        echo "📄 $file - будет обновлен"
    else
        echo "❌ $file - отсутствует"
    fi
done

echo ""
echo "📊 СТАТУС GITHUB:"
echo "=================="
git status --porcelain

echo ""
echo "📝 ПОСЛЕДНИЕ КОММИТЫ:"
echo "======================"
git log --oneline -5

echo ""
echo "🌐 ПРОВЕРКА ПРИЛОЖЕНИЯ:"
echo "======================="
echo "Статус PM2:"
pm2 status edahouse

echo ""
echo "Проверка доступности:"
curl -s -o /dev/null -w "HTTP %{http_code} - %{url_effective}" https://edahouse.ordis.co.il/api/products
echo ""
curl -s -o /dev/null -w "HTTP %{http_code} - %{url_effective}" https://edahouse.ordis.co.il/api/categories
echo ""

echo ""
echo "💡 КОМАНДА ДЛЯ БЕЗОПАСНОГО ОБНОВЛЕНИЯ:"
echo "======================================"
echo "bash scripts/safe-vps-update.sh"
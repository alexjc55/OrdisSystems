#!/bin/bash

# Скрипт для загрузки ВСЕГО проекта в GitHub из Replit
echo "📤 Загружаем весь проект в GitHub..."

# Проверяем статус Git
echo "📊 Текущий статус Git:"
git status

echo ""
echo "📋 Файлы для загрузки:"

# Добавляем ВСЕ файлы (включая новые)
git add .

echo "✅ Все файлы добавлены в Git"

# Показываем что будет закоммичено
echo ""
echo "📄 Файлы в коммите:"
git status --staged

echo ""
echo "💾 Создаем коммит с текущим состоянием проекта..."
git commit -m "Complete project sync from Replit - $(date '+%Y-%m-%d %H:%M:%S')

- All 52 products with full database export
- Complete multilingual support (RU/EN/HE/AR)
- VPS deployment scripts and safety tools
- Full PWA functionality with push notifications
- Radix UI scroll-lock disabled as requested
- Complete theme management system
- Admin dashboard with proper permissions
- Database exports for VPS deployment"

echo ""
echo "🚀 Загружаем в GitHub..."
git push origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ УСПЕШНО! Весь проект загружен в GitHub"
    echo ""
    echo "📋 Что загружено:"
    echo "  - Весь код приложения (client/, server/, shared/)"
    echo "  - Все 52 продукта в database-exports/"
    echo "  - Скрипты безопасного обновления VPS"
    echo "  - Конфигурационные файлы"
    echo "  - Документация и инструкции"
    echo ""
    echo "🌐 Теперь можешь обновить VPS командой:"
    echo "    bash scripts/safe-vps-update.sh"
else
    echo ""
    echo "❌ Ошибка при загрузке в GitHub"
    echo "Проверь подключение к GitHub и права доступа"
fi
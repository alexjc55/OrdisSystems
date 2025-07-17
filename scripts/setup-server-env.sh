#!/bin/bash

# SETUP SERVER ENVIRONMENT VARIABLES
# Помогает настроить переменные окружения на VPS сервере

echo "🔧 НАСТРОЙКА ПЕРЕМЕННЫХ ОКРУЖЕНИЯ СЕРВЕРА"
echo "=========================================="

# Проверяем существование .env файла
if [ ! -f ".env" ]; then
    echo "❌ Файл .env не найден!"
    echo "Создание .env файла из шаблона..."
    
    if [ -f ".env.vps" ]; then
        cp .env.vps .env
        echo "✅ Скопирован .env.vps -> .env"
    elif [ -f ".env.example" ]; then
        cp .env.example .env
        echo "✅ Скопирован .env.example -> .env"
    else
        echo "Создание базового .env файла..."
        cat > .env << EOF
# VPS Server Configuration
NODE_ENV=production
PORT=3000
USE_NEON=false

# Database Configuration (ТРЕБУЕТ НАСТРОЙКИ!)
DATABASE_URL=postgresql://username:password@localhost:5432/edahouse_ord

# Session Secret (ИЗМЕНИТЕ НА СЛУЧАЙНУЮ СТРОКУ!)
SESSION_SECRET=$(openssl rand -base64 32)

# App Configuration
ADMIN_EMAIL=admin@edahouse.local
DEFAULT_ADMIN_PASSWORD=admin123
EOF
        echo "✅ Создан базовый .env файл"
    fi
else
    echo "✅ Файл .env уже существует"
fi

echo ""
echo "📝 ПРОВЕРКА ПЕРЕМЕННЫХ ОКРУЖЕНИЯ:"
echo "=================================="

# Загружаем переменные из .env
if [ -f ".env" ]; then
    source .env
fi

# Проверяем ключевые переменные
echo "NODE_ENV: ${NODE_ENV:-❌ НЕ УСТАНОВЛЕН}"
echo "PORT: ${PORT:-❌ НЕ УСТАНОВЛЕН}"
echo "USE_NEON: ${USE_NEON:-❌ НЕ УСТАНОВЛЕН}"

if [ -z "$DATABASE_URL" ]; then
    echo "DATABASE_URL: ❌ НЕ УСТАНОВЛЕН!"
    echo ""
    echo "🚨 КРИТИЧЕСКАЯ ОШИБКА: DATABASE_URL не настроен!"
    echo ""
    echo "Отредактируйте .env файл и установите правильный DATABASE_URL:"
    echo "nano .env"
    echo ""
    echo "Пример для PostgreSQL:"
    echo "DATABASE_URL=postgresql://dbuser:dbpass@localhost:5432/edahouse_ord"
    echo ""
    echo "Для получения параметров БД обратитесь к администратору хостинга."
    exit 1
else
    echo "DATABASE_URL: ✅ УСТАНОВЛЕН"
fi

if [ -z "$SESSION_SECRET" ]; then
    echo "SESSION_SECRET: ❌ НЕ УСТАНОВЛЕН!"
    echo "Генерация нового SESSION_SECRET..."
    NEW_SECRET=$(openssl rand -base64 32)
    
    # Добавляем SESSION_SECRET в .env если его нет
    if ! grep -q "SESSION_SECRET" .env; then
        echo "SESSION_SECRET=$NEW_SECRET" >> .env
        echo "✅ SESSION_SECRET добавлен в .env"
    fi
else
    echo "SESSION_SECRET: ✅ УСТАНОВЛЕН"
fi

echo ""
echo "🔄 ПЕРЕЗАГРУЗКА PM2 С НОВЫМИ ПЕРЕМЕННЫМИ..."
echo "============================================"

# Обновляем PM2 environment
if command -v pm2 &> /dev/null; then
    echo "Перезапуск PM2 приложения..."
    pm2 reload ecosystem.config.cjs --env production
    
    if [ $? -eq 0 ]; then
        echo "✅ PM2 приложение перезапущено с новыми переменными"
    else
        echo "⚠️  Ошибка перезапуска PM2, попробуйте вручную:"
        echo "pm2 restart edahouse"
    fi
else
    echo "⚠️  PM2 не найден, перезапустите приложение вручную"
fi

echo ""
echo "✅ НАСТРОЙКА ЗАВЕРШЕНА!"
echo "======================"
echo ""
echo "Теперь можно запустить исправление базы данных:"
echo "./scripts/fix-server-database.sh"
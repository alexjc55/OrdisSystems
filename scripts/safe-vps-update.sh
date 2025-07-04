#!/bin/bash

# Безопасное обновление кода на VPS без затирания конфигов
# Сохраняет важные файлы конфигурации и восстанавливает их после обновления

echo "🔄 Начинаем безопасное обновление VPS..."

# Переходим в директорию проекта
cd ~/www/edahouse.ordis.co.il

# Создаем временную папку для бэкапов конфигов
mkdir -p temp_backup_configs

echo "📋 Сохраняем критически важные конфиги VPS..."

# Сохраняем файлы конфигурации VPS
cp .env temp_backup_configs/.env 2>/dev/null || echo "❌ .env не найден"
cp ecosystem.config.cjs temp_backup_configs/ecosystem.config.cjs 2>/dev/null || echo "❌ ecosystem.config.cjs не найден"  
cp ecosystem.production.config.cjs temp_backup_configs/ecosystem.production.config.cjs 2>/dev/null || echo "❌ ecosystem.production.config.cjs не найден"

# Сохраняем загруженные изображения
if [ -d "uploads" ]; then
    echo "📁 Сохраняем папку uploads..."
    cp -r uploads temp_backup_configs/uploads
fi

# Сохраняем любые custom Nginx конфиги (если есть)
if [ -f "nginx.conf" ]; then
    cp nginx.conf temp_backup_configs/nginx.conf
    echo "📝 Сохранен nginx.conf"
fi

echo "✅ Конфиги сохранены в temp_backup_configs/"

# Останавливаем приложение
echo "🛑 Останавливаем приложение..."
pm2 stop edahouse

# Получаем обновления из GitHub
echo "📥 Получаем обновления из GitHub..."
git stash push -m "VPS configs backup $(date)" || echo "Нет локальных изменений для stash"
git pull origin main

if [ $? -eq 0 ]; then
    echo "✅ Код успешно обновлен из GitHub"
else
    echo "❌ Ошибка при обновлении из GitHub"
    exit 1
fi

# Восстанавливаем критические конфиги
echo "🔧 Восстанавливаем конфиги VPS..."

cp temp_backup_configs/.env .env 2>/dev/null && echo "✅ .env восстановлен"
cp temp_backup_configs/ecosystem.config.cjs ecosystem.config.cjs 2>/dev/null && echo "✅ ecosystem.config.cjs восстановлен"
cp temp_backup_configs/ecosystem.production.config.cjs ecosystem.production.config.cjs 2>/dev/null && echo "✅ ecosystem.production.config.cjs восстановлен"

# Восстанавливаем uploads
if [ -d "temp_backup_configs/uploads" ]; then
    cp -r temp_backup_configs/uploads ./
    echo "✅ Папка uploads восстановлена"
fi

# Восстанавливаем nginx.conf если был
if [ -f "temp_backup_configs/nginx.conf" ]; then
    cp temp_backup_configs/nginx.conf nginx.conf
    echo "✅ nginx.conf восстановлен"
fi

# Устанавливаем зависимости (если package.json изменился)
echo "📦 Проверяем зависимости..."
npm install

# Компилируем код если нужно
echo "🔨 Собираем проект..."
npm run build 2>/dev/null || echo "ℹ️ Build не требуется или отсутствует"

# Запускаем приложение
echo "🚀 Запускаем приложение..."
pm2 restart edahouse

# Проверяем статус
echo "📊 Проверяем статус приложения..."
pm2 status edahouse

# Удаляем временные файлы
echo "🧹 Очищаем временные файлы..."
rm -rf temp_backup_configs

echo ""
echo "✅ Обновление завершено!"
echo "🌐 Проверь сайт: https://edahouse.ordis.co.il"
echo ""
echo "📋 Что было сделано:"
echo "   - Сохранены критические конфиги VPS (.env, PM2, uploads)"
echo "   - Обновлен код из GitHub"
echo "   - Восстановлены конфиги VPS" 
echo "   - Перезапущено приложение"
echo ""
echo "🔍 Для проверки логов: pm2 logs edahouse"
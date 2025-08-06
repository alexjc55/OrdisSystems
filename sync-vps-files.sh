#!/bin/bash

# Скрипт для синхронизации файлов с VPS сервером
# Использование: ./sync-vps-files.sh

echo "🔄 Начинаю синхронизацию файлов с VPS сервером..."

# Параметры подключения
VPS_HOST="ordis.co.il"
VPS_USER="ordis_co_il_usr@vxaorzmkzo"
VPS_PATH="/var/www/edahouse.ordis.co.il"

# Проверка доступности сервера
echo "🔍 Проверяю доступность сервера..."
if ! ping -c 1 $VPS_HOST &> /dev/null; then
    echo "❌ Сервер недоступен!"
    exit 1
fi

echo "✅ Сервер доступен"

# Остановка приложения на сервере
echo "⏸️  Останавливаю приложение на сервере..."
ssh $VPS_USER@$VPS_HOST "cd $VPS_PATH && pm2 stop edahouse"

# Создание резервной копии на сервере
echo "💾 Создаю резервную копию на сервере..."
ssh $VPS_USER@$VPS_HOST "cp -r $VPS_PATH $VPS_PATH.backup.\$(date +%Y%m%d_%H%M%S)"

# Синхронизация основных файлов
echo "📁 Синхронизирую файлы..."

# Исключения для rsync
EXCLUDE_FILE="/tmp/rsync_exclude"
cat > $EXCLUDE_FILE << 'EOF'
node_modules/
.git/
*.log
.env
uploads/
database-exports/
backups/
attached_assets/
*.backup
*.sql
dist/
build/
.replit
EOF

# Синхронизация всех файлов кроме исключений
rsync -avz --progress \
    --exclude-from=$EXCLUDE_FILE \
    --delete \
    ./ $VPS_USER@$VPS_HOST:$VPS_PATH/

# Очистка временного файла
rm $EXCLUDE_FILE

# Установка зависимостей на сервере
echo "📦 Устанавливаю зависимости на сервере..."
ssh $VPS_USER@$VPS_HOST "cd $VPS_PATH && npm ci --production"

# Сборка приложения на сервере
echo "🔨 Собираю приложение на сервере..."
ssh $VPS_USER@$VPS_HOST "cd $VPS_PATH && npm run build"

# Запуск приложения
echo "🚀 Запускаю приложение на сервере..."
ssh $VPS_USER@$VPS_HOST "cd $VPS_PATH && pm2 start ecosystem.production.config.cjs"

# Проверка статуса
echo "📊 Проверяю статус приложения..."
ssh $VPS_USER@$VPS_HOST "cd $VPS_PATH && pm2 status"

# Проверка работоспособности API
echo "🔍 Проверяю работоспособность API..."
sleep 5  # Ждем запуска

if ssh $VPS_USER@$VPS_HOST "curl -s http://localhost:3000/api/version" | grep -q "version"; then
    echo "✅ Синхронизация завершена успешно!"
    echo "🌐 Сайт должен работать корректно"
else
    echo "⚠️  API не отвечает, проверьте логи:"
    ssh $VPS_USER@$VPS_HOST "cd $VPS_PATH && pm2 logs edahouse --lines 20"
fi

echo "📝 Для проверки логов используйте:"
echo "   ssh $VPS_USER@$VPS_HOST 'cd $VPS_PATH && pm2 logs edahouse'"
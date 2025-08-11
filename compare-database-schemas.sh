#!/bin/bash

# Скрипт для сравнения структуры баз данных между локальной и VPS

echo "🔍 СРАВНЕНИЕ СТРУКТУРЫ БАЗ ДАННЫХ"
echo "================================="

VPS_HOST="ordis.co.il"
VPS_USER="ordis_co_il_usr@vxaorzmkzo"
VPS_DB_USER="edahouse_usr"
VPS_DB_NAME="edahouse"

echo "📊 Получение структуры локальной базы данных..."
# Сохранить структуру локальной базы данных
echo "Локальная база данных (Replit):" > local_schema.txt
echo "Колонки слайдера:" >> local_schema.txt

# Здесь нужно вставить результат из локальной базы данных
# (будет добавлен после получения данных)

echo "📊 Получение структуры VPS базы данных..."
# Получить структуру VPS базы данных
ssh $VPS_USER@$VPS_HOST "psql -h localhost -U $VPS_DB_USER -d $VPS_DB_NAME -c \"SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name = 'store_settings' AND (column_name LIKE '%slider%' OR column_name LIKE '%slide%') ORDER BY column_name;\"" > vps_schema.txt

echo "🔍 Сравнение результатов..."
echo "VPS база данных содержит следующие колонки слайдера:"
cat vps_schema.txt

echo ""
echo "📝 Для создания недостающих колонок выполните:"
echo "1. Сравните файлы local_schema.txt и vps_schema.txt"
echo "2. Создайте SQL команды для добавления недостающих колонок"
echo "3. Примените миграцию на VPS сервере"

echo "✅ Сравнение завершено. Проверьте файлы local_schema.txt и vps_schema.txt"
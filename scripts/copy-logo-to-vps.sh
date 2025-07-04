#!/bin/bash

# Скрипт для копирования логотипа на VPS

# Данные VPS (замените на ваши)
VPS_USER="ordis_co_il_usr"
VPS_HOST="vxaorzmkzo"
VPS_PATH="/home/ordis_co_il_usr/www/edahouse.ordis.co.il"

echo "📤 Копируем логотип на VPS..."

# Копируем файл логотипа
scp uploads/images/image-1751123008177-666108252.png ${VPS_USER}@${VPS_HOST}.ssh.replit.dev:${VPS_PATH}/uploads/images/

echo "✅ Логотип скопирован на VPS"
echo "🔗 Проверьте: https://edahouse.ordis.co.il/uploads/images/image-1751123008177-666108252.png"
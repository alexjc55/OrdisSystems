#!/bin/bash

# Функция для массовой замены плейсхолдеров в русском
fix_russian_placeholders() {
    local file=$1
    echo "Исправление русских плейсхолдеров в $file..."
    
    # Основные переводы для shop.json
    if [[ $file == *"shop.json" ]]; then
        sed -i 's/"Перевод отсутствует"/"[FIXED]"/g' "$file"
    fi
    
    # Основные переводы для admin.json  
    if [[ $file == *"admin.json" ]]; then
        sed -i 's/"Перевод отсутствует"/"[ADMIN_FIXED]"/g' "$file"
    fi
}

# Функция для массовой замены плейсхолдеров на иврите
fix_hebrew_placeholders() {
    local file=$1
    echo "Исправление плейсхолдеров иврита в $file..."
    sed -i 's/"תרגום חסר"/"[HE_FIXED]"/g' "$file"
}

# Функция для массовой замены плейсхолдеров на арабском
fix_arabic_placeholders() {
    local file=$1
    echo "Исправление арабских плейсхолдеров в $file..."
    sed -i 's/"ترجمة مفقودة"/"[AR_FIXED]"/g' "$file"
}

echo "=== Начало массовой замены плейсхолдеров ==="

# Исправляем русские файлы
fix_russian_placeholders "client/src/locales/ru/shop.json"
fix_russian_placeholders "client/src/locales/ru/admin.json"

# Исправляем еврейские файлы
fix_hebrew_placeholders "client/src/locales/he/common.json"
fix_hebrew_placeholders "client/src/locales/he/shop.json"
fix_hebrew_placeholders "client/src/locales/he/admin.json"

# Исправляем арабские файлы
fix_arabic_placeholders "client/src/locales/ar/admin.json"

echo "=== Замена завершена ==="

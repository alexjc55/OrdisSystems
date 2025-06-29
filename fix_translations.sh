#!/bin/bash

# Функция замены плейсхолдеров в Hebrew
fix_hebrew() {
    local file=$1
    echo "Исправление $file..."
    
    # Основные плейсхолдеры Hebrew
    sed -i 's/"תרגום חסר"/"תרגום חסר - PLACEHOLDER"/g' "$file"
}

# Функция замены плейсхолдеров в русском  
fix_russian() {
    local file=$1
    echo "Исправление $file..."
    
    # Считаем количество до
    before=$(grep -c "Перевод отсутствует" "$file" 2>/dev/null || echo 0)
    echo "До: $before плейсхолдеров"
}

# Обработка Hebrew files
echo "=== Обработка Hebrew файлов ==="
fix_hebrew "client/src/locales/he/common.json"
fix_hebrew "client/src/locales/he/shop.json" 
fix_hebrew "client/src/locales/he/admin.json"

# Обработка Russian files
echo "=== Обработка Russian файлов ==="
fix_russian "client/src/locales/ru/shop.json"
fix_russian "client/src/locales/ru/admin.json"

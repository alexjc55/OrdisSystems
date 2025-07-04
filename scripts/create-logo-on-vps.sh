#!/bin/bash

# Скрипт для создания простого логотипа на VPS

echo "🎨 Создаем временный логотип на VPS..."

# Создаем простой SVG логотип eDAHouse
cat > temp_logo.svg << 'EOF'
<svg width="120" height="40" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#ff6b35;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#f7931e;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="120" height="40" rx="8" fill="url(#grad)"/>
  <text x="60" y="26" font-family="Arial, sans-serif" font-size="14" font-weight="bold" text-anchor="middle" fill="white">eDAHouse</text>
</svg>
EOF

echo "✅ SVG логотип создан как temp_logo.svg"
echo "📋 Скопируйте этот файл на VPS в папку uploads/images/ с именем image-1751123008177-666108252.png"
echo "💡 Или обновите базу данных с новым путем к логотипу"
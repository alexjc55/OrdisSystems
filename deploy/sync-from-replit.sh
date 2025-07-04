#!/bin/bash

# =============================================================================
# eDAHouse - Синхронизация с Replit/GitHub (ГИБРИДНОЕ РЕШЕНИЕ)
# =============================================================================
# Этот скрипт для случая, когда на сервере проект частично есть, 
# но нужно добавить недостающие файлы и обновить измененные
# =============================================================================

set -e  # Выход при любой ошибке

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Реальные параметры VPS
PROJECT_PATH="/var/www/ordis_co_il_usr/data/www/edahouse.ordis.co.il"
SHORT_PATH="www/edahouse.ordis.co.il"
GITHUB_REPO="https://github.com/alexjc55/Ordis.git"
TEMP_DIR="/tmp/edahouse_sync_$(date +%s)"

echo -e "${BLUE}🔄 eDAHouse - Синхронизация с GitHub${NC}"
echo "=============================================="

# Проверка текущей директории
if [ "$(pwd)" != "$PROJECT_PATH" ]; then
    echo -e "${YELLOW}⚠️  Переход в правильную директорию...${NC}"
    cd "$PROJECT_PATH" || {
        echo -e "${RED}❌ Ошибка: Невозможно перейти в $PROJECT_PATH${NC}"
        echo "Создайте директорию проекта сначала:"
        echo "mkdir -p $PROJECT_PATH"
        exit 1
    }
fi

echo -e "${BLUE}📁 Рабочая директория: $(pwd)${NC}"

# Создание резервной копии перед синхронизацией
echo -e "${YELLOW}💾 Создание резервной копии...${NC}"
BACKUP_DIR="/var/backups/edahouse/sync_backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Копируем критически важные файлы
if [ -f ".env" ]; then
    cp .env "$BACKUP_DIR/"
    echo "✅ Сохранен .env"
fi

if [ -d "uploads" ]; then
    cp -r uploads "$BACKUP_DIR/"
    echo "✅ Сохранена папка uploads"
fi

if [ -f "ecosystem.config.js" ]; then
    cp ecosystem.config.js "$BACKUP_DIR/"
    echo "✅ Сохранен ecosystem.config.js"
fi

# Клонирование свежей версии во временную папку
echo -e "${BLUE}📥 Загрузка свежей версии с GitHub...${NC}"
git clone "$GITHUB_REPO" "$TEMP_DIR"

if [ ! -d "$TEMP_DIR" ]; then
    echo -e "${RED}❌ Ошибка клонирования репозитория${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Репозиторий загружен в $TEMP_DIR${NC}"

# Функция для синхронизации файлов
sync_files() {
    local source_dir="$1"
    local target_dir="$2"
    local file_pattern="$3"
    local description="$4"
    
    echo -e "${YELLOW}🔄 Синхронизация: $description${NC}"
    
    if [ -d "$source_dir" ]; then
        rsync -av --include="$file_pattern" --exclude="*" "$source_dir/" "$target_dir/"
        echo "✅ $description обновлены"
    else
        echo "⚠️  $source_dir не найдена, пропускаем"
    fi
}

# Синхронизация по категориям файлов
echo -e "${BLUE}🔄 Синхронизация файлов...${NC}"

# 1. Скрипты развертывания (самое важное!)
if [ -d "$TEMP_DIR/deploy" ]; then
    echo -e "${YELLOW}📜 Обновление скриптов развертывания...${NC}"
    rsync -av "$TEMP_DIR/deploy/" ./deploy/
    chmod +x deploy/*.sh
    echo "✅ Скрипты развертывания обновлены"
fi

# 2. Конфигурационные файлы
echo -e "${YELLOW}⚙️  Обновление конфигурации...${NC}"
for config_file in "package.json" "package-lock.json" "tsconfig.json" "tailwind.config.ts" "vite.config.ts" "drizzle.config.ts"; do
    if [ -f "$TEMP_DIR/$config_file" ]; then
        cp "$TEMP_DIR/$config_file" ./
        echo "✅ $config_file обновлен"
    fi
done

# 3. Исходный код сервера
sync_files "$TEMP_DIR/server" "./server" "*" "Серверный код"

# 4. Исходный код клиента
sync_files "$TEMP_DIR/client" "./client" "*" "Клиентский код"

# 5. Общие схемы и типы
sync_files "$TEMP_DIR/shared" "./shared" "*" "Общие типы и схемы"

# 6. Документация
echo -e "${YELLOW}📚 Обновление документации...${NC}"
for doc_file in "README.md" "replit.md" "*.md"; do
    if [ -f "$TEMP_DIR/$doc_file" ]; then
        cp "$TEMP_DIR/$doc_file" ./
    fi
done

# Восстановление критически важных файлов
echo -e "${YELLOW}🔄 Восстановление локальных настроек...${NC}"

# Восстанавливаем .env если был
if [ -f "$BACKUP_DIR/.env" ]; then
    cp "$BACKUP_DIR/.env" ./
    echo "✅ .env восстановлен"
fi

# Восстанавливаем uploads если был
if [ -d "$BACKUP_DIR/uploads" ]; then
    cp -r "$BACKUP_DIR/uploads" ./
    echo "✅ uploads восстановлена"
fi

# Восстанавливаем PM2 конфигурацию если была
if [ -f "$BACKUP_DIR/ecosystem.config.js" ]; then
    cp "$BACKUP_DIR/ecosystem.config.js" ./
    echo "✅ ecosystem.config.js восстановлен"
fi

# Проверка и создание .env если его нет
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚙️  Создание .env файла...${NC}"
    cat > .env << EOF
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://ordis_co_il_usr:33V0R1N5qi81paiA@localhost:5432/edahouse_ord
SESSION_SECRET=$(openssl rand -base64 32)
EOF
    echo "✅ .env создан с базовыми настройками"
fi

# Установка зависимостей
echo -e "${BLUE}📦 Установка зависимостей...${NC}"
npm install

# Сборка проекта
echo -e "${BLUE}🔨 Сборка проекта...${NC}"
npm run build

# Обновление базы данных
echo -e "${BLUE}🗄️  Обновление схемы базы данных...${NC}"
npm run db:push

# Перезапуск приложения
echo -e "${BLUE}🔄 Перезапуск приложения...${NC}"
pm2 stop edahouse 2>/dev/null || echo "Приложение не было запущено"
pm2 start ecosystem.config.js
pm2 save

# Очистка временных файлов
echo -e "${YELLOW}🧹 Очистка временных файлов...${NC}"
rm -rf "$TEMP_DIR"

# Финальная проверка
echo -e "${BLUE}🔍 Проверка состояния...${NC}"
sleep 3
pm2 status | grep edahouse || echo "Приложение не найдено в PM2"

echo ""
echo -e "${GREEN}✅ СИНХРОНИЗАЦИЯ ЗАВЕРШЕНА!${NC}"
echo "=============================================="
echo -e "${BLUE}📊 Статистика:${NC}"
echo "• Резервная копия: $BACKUP_DIR"
echo "• Проект обновлен из: $GITHUB_REPO"
echo "• Приложение: $(pm2 jlist | jq -r '.[] | select(.name=="edahouse") | .pm2_env.status' 2>/dev/null || echo 'unknown')"
echo ""
echo -e "${YELLOW}🔗 Проверьте работу:${NC}"
echo "• Локально: curl http://localhost:3000/api/health"
echo "• Онлайн: https://edahouse.ordis.co.il"
echo ""
echo -e "${GREEN}🎉 Готово! Никаких танцев с бубном!${NC}"
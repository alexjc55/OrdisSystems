#!/bin/bash

# ===================================================================
# СКРИПТ ПОИСКА И ИСПРАВЛЕНИЯ НАСТРОЕК БАЗЫ ДАННЫХ
# ===================================================================

echo "🔍 Ищем настройки базы данных..."

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info() {
    echo -e "${BLUE}[i]${NC} $1"
}

print_found() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

echo "================================================================"
echo "1. ПРОВЕРЯЕМ ФАЙЛЫ КОНФИГУРАЦИИ"
echo "================================================================"

# Ищем .env файлы
print_info "Поиск .env файлов..."
if [ -f ".env" ]; then
    print_found "Найден .env файл"
    echo "Содержимое .env (без паролей):"
    grep -E "(DATABASE|POSTGRES|PG)" .env | sed 's/=.*password.*/=***скрыто***/'
else
    print_warning ".env файл не найден"
fi

echo "================================================================"
echo "2. ПРОВЕРЯЕМ PM2 КОНФИГУРАЦИЮ"
echo "================================================================"

# Ищем настройки PM2
print_info "Проверяем PM2 процессы..."
pm2 list 2>/dev/null || print_warning "PM2 не найден или не запущен"

# Ищем ecosystem файлы
if [ -f "ecosystem.config.js" ] || [ -f "ecosystem.config.cjs" ]; then
    print_found "Найден ecosystem config:"
    ls -la ecosystem.config.*
    echo "Содержимое (без паролей):"
    cat ecosystem.config.* 2>/dev/null | grep -E "(DATABASE|POSTGRES|PG)" | sed 's/password.*/password: "***скрыто***"/'
fi

echo "================================================================"
echo "3. ПРОВЕРЯЕМ СИСТЕМНЫЕ НАСТРОЙКИ POSTGRESQL"
echo "================================================================"

# Проверяем статус PostgreSQL
print_info "Статус PostgreSQL..."
sudo systemctl status postgresql 2>/dev/null | head -5 || print_warning "Не удалось проверить статус PostgreSQL"

# Проверяем пользователей PostgreSQL
print_info "Пользователи PostgreSQL..."
sudo -u postgres psql -c "\du" 2>/dev/null || print_warning "Не удалось получить список пользователей"

echo "================================================================"
echo "4. ТЕСТИРУЕМ РАЗНЫЕ СПОСОБЫ ПОДКЛЮЧЕНИЯ"
echo "================================================================"

# Тестируем разные варианты подключения
print_info "Тестируем подключения..."

# Вариант 1: локальное подключение от postgres
echo "Тест 1: sudo -u postgres psql"
if sudo -u postgres psql -c "SELECT version();" 2>/dev/null | head -1; then
    print_found "✓ Подключение от пользователя postgres работает"
    
    # Проверяем базы данных
    echo "Доступные базы данных:"
    sudo -u postgres psql -c "\l" 2>/dev/null | grep -E "(edahouse|eDAHouse)" || echo "База edahouse не найдена"
else
    print_warning "✗ Подключение от пользователя postgres не работает"
fi

# Вариант 2: подключение с текущим пользователем
echo ""
echo "Тест 2: psql с текущим пользователем"
if psql -h localhost -U postgres -c "SELECT version();" 2>/dev/null | head -1; then
    print_found "✓ Подключение с пользователем postgres работает"
else
    print_warning "✗ Подключение с пользователем postgres не работает"
fi

echo "================================================================"
echo "5. СОЗДАЕМ ПРАВИЛЬНУЮ СТРОКУ ПОДКЛЮЧЕНИЯ"
echo "================================================================"

# Попробуем найти правильную строку подключения
print_info "Ищем рабочее подключение..."

# Тестируем варианты
if sudo -u postgres psql -c "\l" | grep -i edahouse >/dev/null 2>&1; then
    DB_NAME=$(sudo -u postgres psql -c "\l" | grep -i edahouse | awk '{print $1}' | head -1)
    print_found "Найдена база данных: $DB_NAME"
    
    echo ""
    echo "РЕКОМЕНДУЕМЫЕ КОМАНДЫ ДЛЯ МИГРАЦИИ:"
    echo "================================================================"
    echo "# Вариант 1 (рекомендуется):"
    echo "sudo -u postgres psql -d $DB_NAME -f auto-migrate.sql"
    echo ""
    echo "# Вариант 2:"  
    echo "psql -h localhost -U postgres -d $DB_NAME -f auto-migrate.sql"
    echo ""
    echo "# Вариант 3 (если есть пароль):"
    echo "PGPASSWORD='your_password' psql -h localhost -U postgres -d $DB_NAME -f auto-migrate.sql"
    echo "================================================================"
else
    print_warning "База данных edahouse не найдена"
    echo ""
    echo "Попробуйте найти базу данных вручную:"
    echo "sudo -u postgres psql -c '\l'"
fi

echo ""
echo "================================================================"
echo "6. ПОИСК КОНФИГУРАЦИИ В ПРОЕКТЕ"
echo "================================================================"

# Ищем упоминания базы данных в коде
print_info "Поиск настроек в коде..."
grep -r -i "database\|postgres\|pg" . --include="*.js" --include="*.ts" --include="*.json" --include="*.env*" 2>/dev/null | grep -v node_modules | head -10

echo ""
echo "Проверьте эти файлы для получения правильных настроек подключения."
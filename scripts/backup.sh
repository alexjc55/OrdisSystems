#!/bin/bash

# Скрипт автоматического резервного копирования eDAHouse
# Создает полные резервные копии базы данных и файлов

set -e

PROJECT_NAME="${1:-edahouse}"
BACKUP_DIR="${2:-./backups}"
RETAIN_DAYS="${3:-7}"

echo "💾 Создание резервной копии проекта $PROJECT_NAME"

# Создаем директорию для бэкапов
mkdir -p "$BACKUP_DIR"

DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="${PROJECT_NAME}_backup_$DATE"
BACKUP_PATH="$BACKUP_DIR/$BACKUP_NAME"

echo "📁 Создаем директорию бэкапа: $BACKUP_PATH"
mkdir -p "$BACKUP_PATH"

# Загружаем переменные окружения
if [ -f ".env" ]; then
    source .env
else
    echo "❌ Файл .env не найден"
    exit 1
fi

echo "🗄️ Создаем резервную копию базы данных..."
pg_dump "$DATABASE_URL" > "$BACKUP_PATH/database.sql"

echo "📂 Создаем резервную копию загруженных файлов..."
if [ -d "uploads" ]; then
    cp -r uploads "$BACKUP_PATH/"
else
    echo "⚠️ Директория uploads не найдена"
fi

echo "⚙️ Создаем резервную копию конфигурации..."
cp .env "$BACKUP_PATH/"

# Информация о системе
cat > "$BACKUP_PATH/info.txt" <<EOF
=== ИНФОРМАЦИЯ О РЕЗЕРВНОЙ КОПИИ ===
Проект: $PROJECT_NAME
Дата создания: $(date)
Версия Node.js: $(node --version)
Версия npm: $(npm --version)
Коммит Git: $(git rev-parse HEAD 2>/dev/null || echo "N/A")
Ветка Git: $(git branch --show-current 2>/dev/null || echo "N/A")

=== ПЕРЕМЕННЫЕ ОКРУЖЕНИЯ ===
NODE_ENV=$NODE_ENV
PORT=$PORT
PGDATABASE=$PGDATABASE
PGUSER=$PGUSER

=== СТАТИСТИКА ===
Размер базы данных: $(du -h "$BACKUP_PATH/database.sql" | cut -f1)
Размер файлов: $(du -sh "$BACKUP_PATH/uploads" 2>/dev/null | cut -f1 || echo "N/A")
EOF

# Создаем архив
echo "📦 Создаем архив..."
cd "$BACKUP_DIR"
tar -czf "${BACKUP_NAME}.tar.gz" "$BACKUP_NAME"
rm -rf "$BACKUP_NAME"

echo "🧹 Очистка старых бэкапов (старше $RETAIN_DAYS дней)..."
find "$BACKUP_DIR" -name "${PROJECT_NAME}_backup_*.tar.gz" -type f -mtime +$RETAIN_DAYS -delete

# Статистика
BACKUP_SIZE=$(du -h "${BACKUP_NAME}.tar.gz" | cut -f1)
BACKUP_COUNT=$(ls -1 ${PROJECT_NAME}_backup_*.tar.gz 2>/dev/null | wc -l)

echo ""
echo "✅ Резервная копия создана успешно!"
echo "📁 Файл: $BACKUP_DIR/${BACKUP_NAME}.tar.gz"
echo "📊 Размер: $BACKUP_SIZE"
echo "📈 Всего бэкапов: $BACKUP_COUNT"

# Создаем скрипт восстановления
cat > "$BACKUP_DIR/restore_${BACKUP_NAME}.sh" <<EOF
#!/bin/bash

# Скрипт восстановления из резервной копии
# Файл: ${BACKUP_NAME}.tar.gz

set -e

echo "🔄 Восстановление из резервной копии $BACKUP_NAME"

# Проверяем что файл бэкапа существует
if [ ! -f "${BACKUP_NAME}.tar.gz" ]; then
    echo "❌ Файл бэкапа не найден: ${BACKUP_NAME}.tar.gz"
    exit 1
fi

read -p "⚠️ ВНИМАНИЕ: Это перезапишет текущие данные. Продолжить? (y/N): " -n 1 -r
echo
if [[ ! \$REPLY =~ ^[Yy]\$ ]]; then
    echo "Операция отменена"
    exit 1
fi

echo "📦 Распаковываем архив..."
tar -xzf "${BACKUP_NAME}.tar.gz"

echo "🗄️ Восстанавливаем базу данных..."
# Удаляем текущую БД и создаем новую
dropdb -U \$PGUSER -h \$PGHOST -p \$PGPORT \$PGDATABASE --if-exists
createdb -U \$PGUSER -h \$PGHOST -p \$PGPORT \$PGDATABASE
psql -U \$PGUSER -h \$PGHOST -p \$PGPORT -d \$PGDATABASE < "$BACKUP_NAME/database.sql"

echo "📂 Восстанавливаем файлы..."
if [ -d "$BACKUP_NAME/uploads" ]; then
    rm -rf uploads
    mv "$BACKUP_NAME/uploads" uploads
fi

echo "⚙️ Восстанавливаем конфигурацию..."
cp "$BACKUP_NAME/.env" .env

# Очистка
rm -rf "$BACKUP_NAME"

echo "🔄 Перезапускаем приложение..."
pm2 restart $PROJECT_NAME

echo "✅ Восстановление завершено!"
EOF

chmod +x "$BACKUP_DIR/restore_${BACKUP_NAME}.sh"

echo "🔧 Создан скрипт восстановления: $BACKUP_DIR/restore_${BACKUP_NAME}.sh"
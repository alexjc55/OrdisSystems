# Синхронизация изменений с GitHub

## Измененные файлы

### 1. scripts/install-on-vps.sh
**Изменение**: Строки 87-106 заменить на:
```bash
echo "📁 Клонируем проект в $PROJECT_DIR..."

# Удаляем директорию если она уже существует
if [ -d "$PROJECT_DIR" ]; then
    sudo rm -rf "$PROJECT_DIR"
fi

# Клонируем репозиторий
echo "🔄 Клонируем репозиторий edahouse..."
git clone https://github.com/alexjc55/Ordis.git "$PROJECT_DIR"
cd "$PROJECT_DIR"

# Проверяем что клонирование прошло успешно
if [ ! -f "package.json" ]; then
    echo "❌ Ошибка: файл package.json не найден после клонирования"
    echo "⚠️ Проверьте правильность репозитория и доступ к интернету"
    exit 1
fi

echo "✅ Проект успешно клонирован"
```

**И строки 163-187 заменить на:**
```bash
      env: {
        NODE_ENV: 'production',
        PORT: $PORT,
        DATABASE_URL: 'postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME',
        SESSION_SECRET: 'WAVl58TU5MAzQkQa6w8YTsuFYyyCwIl24D2j5BNsX4reNv1iYPdNQHtog2Y0CYQ39U1HGYYG1cNQhLIGfxPVNg==',
        ENABLE_REGISTRATION: 'true',
        ENABLE_GUEST_ORDERS: 'true',
        MAX_FILE_SIZE: '5242880',
        UPLOAD_PATH: './uploads',
        ALLOWED_ORIGINS: 'https://$DOMAIN',
        STORE_NAME: '$PROJECT_NAME',
        STORE_DESCRIPTION: 'Food delivery service'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: $PORT,
        DATABASE_URL: 'postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME',
        SESSION_SECRET: 'WAVl58TU5MAzQkQa6w8YTsuFYyyCwIl24D2j5BNsX4reNv1iYPdNQHtog2Y0CYQ39U1HGYYG1cNQhLIGfxPVNg==',
        ENABLE_REGISTRATION: 'true',
        ENABLE_GUEST_ORDERS: 'true',
        MAX_FILE_SIZE: '5242880',
        UPLOAD_PATH: './uploads',
        ALLOWED_ORIGINS: 'https://$DOMAIN',
        STORE_NAME: '$PROJECT_NAME',
        STORE_DESCRIPTION: 'Food delivery service'
      },
```

### 2. scripts/update-project.sh
**Изменение**: Строки 33-45 заменить на:
```bash
echo "🔄 Получаем последние изменения из репозитория..."
cd "$PROJECT_DIR"

# Проверяем что remote origin настроен правильно
CURRENT_REMOTE=$(git remote get-url origin 2>/dev/null || echo "")
EXPECTED_REMOTE="https://github.com/alexjc55/Ordis.git"

if [ "$CURRENT_REMOTE" != "$EXPECTED_REMOTE" ]; then
    echo "⚠️ Исправляем адрес репозитория..."
    git remote remove origin 2>/dev/null || true
    git remote add origin "$EXPECTED_REMOTE"
    echo "✅ Remote origin установлен: $EXPECTED_REMOTE"
fi

# Сохраняем текущий коммит
CURRENT_COMMIT=$(git rev-parse HEAD)
echo "Текущий коммит: $CURRENT_COMMIT" > "$BACKUP_DIR/commit_$DATE.txt"

# Получаем обновления
git fetch origin
```

### 3. server/index.ts
**Изменение**: Добавить в самое начало файла (строка 1):
```typescript
import 'dotenv/config';
```

### 4. ecosystem.config.cjs
**Изменение**: Заменить env секции (строки 8-33):
```javascript
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        DATABASE_URL: 'postgresql://edahouse_ord:33V0R1N5qi81paiA@localhost:5432/edahouse_ord',
        SESSION_SECRET: 'WAVl58TU5MAzQkQa6w8YTsuFYyyCwIl24D2j5BNsX4reNv1iYPdNQHtog2Y0CYQ39U1HGYYG1cNQhLIGfxPVNg==',
        ENABLE_REGISTRATION: 'true',
        ENABLE_GUEST_ORDERS: 'true',
        MAX_FILE_SIZE: '5242880',
        UPLOAD_PATH: './uploads',
        ALLOWED_ORIGINS: 'https://edahouse.ordis.co.il',
        STORE_NAME: 'edahouse',
        STORE_DESCRIPTION: 'Food delivery service'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        DATABASE_URL: 'postgresql://edahouse_ord:33V0R1N5qi81paiA@localhost:5432/edahouse_ord',
        SESSION_SECRET: 'WAVl58TU5MAzQkQa6w8YTsuFYyyCwIl24D2j5BNsX4reNv1iYPdNQHtog2Y0CYQ39U1HGYYG1cNQhLIGfxPVNg==',
        ENABLE_REGISTRATION: 'true',
        ENABLE_GUEST_ORDERS: 'true',
        MAX_FILE_SIZE: '5242880',
        UPLOAD_PATH: './uploads',
        ALLOWED_ORIGINS: 'https://edahouse.ordis.co.il',
        STORE_NAME: 'edahouse',
        STORE_DESCRIPTION: 'Food delivery service'
      },
```

### 5. package.json
**Изменение**: Добавить в dependencies (после строки 22):
```json
    "dotenv": "^16.4.5",
```

## Новые файлы для создания

### 6. PM2-FIX-INSTRUCTIONS.md
Создать новый файл (см. содержимое ниже)

### 7. PM2-ENV-SETUP.md  
Создать новый файл (см. содержимое ниже)

### 8. REPOSITORY-FIX.md
Создать новый файл (см. содержимое ниже)

## Инструкция по синхронизации

1. Откройте GitHub репозиторий https://github.com/alexjc55/Ordis
2. Внесите указанные изменения в соответствующие файлы
3. Создайте новые файлы с содержимым
4. Сделайте commit с сообщением: "Fix deployment scripts and environment variables loading"
5. Push изменения в main ветку

После синхронизации скрипты установки будут работать корректно с актуальным кодом проекта.
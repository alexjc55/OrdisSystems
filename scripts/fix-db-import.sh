#!/bin/bash

# Исправление импорта PostgreSQL для VPS
echo "🔧 Исправляем импорт базы данных для VPS..."

cd ~/www/edahouse.ordis.co.il

# Создаем корректный db.ts для VPS
cat > server/db.ts << 'EOF'
import pkg from 'pg';
const { Pool } = pkg;
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });
EOF

echo "✅ Файл server/db.ts обновлен для VPS"

# Перезапускаем приложение
echo "🔄 Перезапускаем приложение..."
pm2 restart edahouse

# Ждем запуска
sleep 5

# Проверяем статус
echo "📊 Проверяем статус..."
pm2 status edahouse

# Тестируем API
echo "🧪 Тестируем API..."
curl -s -o /dev/null -w "API Products: HTTP %{http_code}\n" https://edahouse.ordis.co.il/api/products
curl -s -o /dev/null -w "Main Page: HTTP %{http_code}\n" https://edahouse.ordis.co.il/

echo "✅ Исправление завершено!"
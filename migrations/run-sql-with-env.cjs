#!/usr/bin/env node

// SERVER DATABASE FIX - CommonJS версия для выполнения SQL миграции
// Использует переменные из .env файла для подключения к базе данных

const fs = require('fs');
const path = require('path');

// Загружаем переменные из .env файла
const loadEnv = () => {
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, 'utf8');
    envFile.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim();
        // Удаляем кавычки если есть
        const cleanValue = value.replace(/^["']|["']$/g, '');
        process.env[key.trim()] = cleanValue;
      }
    });
    console.log('✅ Переменные окружения загружены из .env файла');
  } else {
    console.log('⚠️  Файл .env не найден');
  }
};

// Загружаем переменные
loadEnv();

// Проверяем DATABASE_URL
if (!process.env.DATABASE_URL) {
  console.error('❌ Ошибка: DATABASE_URL не найден в .env файле');
  process.exit(1);
}

console.log('🔗 Подключение к базе данных:', process.env.DATABASE_URL.replace(/:([^:@]*?)@/, ':***@'));

// Подключаемся к базе данных
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Читаем и выполняем SQL миграцию
const runMigration = async () => {
  const client = await pool.connect();
  
  try {
    console.log('📄 Читаем файл миграции...');
    const sqlPath = path.join(__dirname, 'server-database-fix.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('🔄 Выполняем миграцию...');
    const result = await client.query(sqlContent);
    
    console.log('✅ Миграция выполнена успешно!');
    console.log('📊 Результат:', result.rows || 'SQL выполнен');
    
  } catch (error) {
    console.error('❌ Ошибка выполнения миграции:', error.message);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
};

// Запускаем миграцию
runMigration()
  .then(() => {
    console.log('🎉 База данных успешно исправлена!');
    console.log('🚀 Теперь перезапустите приложение: pm2 restart edahouse');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Критическая ошибка:', error);
    process.exit(1);
  });
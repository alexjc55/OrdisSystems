#!/usr/bin/env node

/**
 * АВТОМАТИЧЕСКОЕ РАЗВЕРТЫВАНИЕ С КЕШ-БАСТИНГОМ
 * 
 * Этот скрипт автоматически:
 * 1. Устанавливает BUILD_TIME в переменные окружения
 * 2. Обновляет timestamp в Service Worker
 * 3. Генерирует новый app hash для определения изменений
 * 4. Запускает сборку приложения
 * 
 * Использование:
 * node auto-deploy.js
 * 
 * Для VPS:
 * BUILD_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ") node auto-deploy.js
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import crypto from 'crypto';

// Цвета для консоли
const colors = {
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(colors[color] + message + colors.reset);
}

function generateTimestamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  
  return `${year}${month}${day}-${hours}${minutes}`;
}

function generateAppHash() {
  const hash = crypto.createHash('md5');
  const filesToCheck = [
    'package.json',
    'client/src/App.tsx',
    'client/src/main.tsx',
    'client/public/sw.js',
    'server/index.ts',
    'server/routes.ts'
  ];
  
  for (const file of filesToCheck) {
    const fullPath = path.join(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      const stats = fs.statSync(fullPath);
      hash.update(`${file}:${stats.mtime.getTime()}`);
    }
  }
  
  return hash.digest('hex').substring(0, 8);
}

function updateServiceWorker(timestamp) {
  const swPath = path.join(process.cwd(), 'client/public/sw.js');
  
  if (!fs.existsSync(swPath)) {
    log('❌ Service Worker файл не найден: ' + swPath, 'red');
    return false;
  }
  
  let swContent = fs.readFileSync(swPath, 'utf8');
  
  // Обновляем BUILD_TIMESTAMP
  const timestampRegex = /const BUILD_TIMESTAMP = '[^']*';/;
  const newTimestamp = `const BUILD_TIMESTAMP = '${timestamp}';`;
  
  if (timestampRegex.test(swContent)) {
    swContent = swContent.replace(timestampRegex, newTimestamp);
  } else {
    log('❌ Не найдена строка BUILD_TIMESTAMP в Service Worker', 'red');
    return false;
  }
  
  fs.writeFileSync(swPath, swContent);
  log('✅ Service Worker обновлен с timestamp: ' + timestamp, 'green');
  return true;
}

function updateEnvFile(buildTime) {
  const envPath = path.join(process.cwd(), '.env');
  let envContent = '';
  
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }
  
  // Обновляем или добавляем BUILD_TIME
  const buildTimeRegex = /BUILD_TIME=.*/;
  const newBuildTime = `BUILD_TIME=${buildTime}`;
  
  if (buildTimeRegex.test(envContent)) {
    envContent = envContent.replace(buildTimeRegex, newBuildTime);
  } else {
    envContent += '\n' + newBuildTime + '\n';
  }
  
  fs.writeFileSync(envPath, envContent);
  log('✅ .env обновлен с BUILD_TIME: ' + buildTime, 'green');
}

function main() {
  log('🚀 Начинается автоматическое развертывание...', 'blue');
  
  // Генерируем timestamp и build time
  const timestamp = generateTimestamp();
  const buildTime = new Date().toISOString();
  const appHash = generateAppHash();
  
  log('📦 Информация о сборке:', 'yellow');
  log('  Timestamp: ' + timestamp);
  log('  Build Time: ' + buildTime);
  log('  App Hash: ' + appHash);
  
  // 1. Обновляем Service Worker
  if (!updateServiceWorker(timestamp)) {
    log('❌ Не удалось обновить Service Worker', 'red');
    process.exit(1);
  }
  
  // 2. Обновляем .env файл
  updateEnvFile(buildTime);
  
  // 3. Устанавливаем переменную окружения для текущего процесса
  process.env.BUILD_TIME = buildTime;
  
  log('✅ Автоматическое развертывание завершено!', 'green');
  log('', 'reset');
  log('📝 Инструкции для пользователей:', 'yellow');
  log('  1. Пользователи автоматически получат уведомление об обновлении');
  log('  2. Администраторы могут использовать кнопку "Очистить кеш" в админ-панели');
  log('  3. Система будет проверять обновления каждые 30 секунд');
  log('', 'reset');
  log('🔄 Для проверки системы:', 'blue');
  log('  - Откройте /test-cache.html для диагностики');
  log('  - Проверьте /api/version для информации о версии');
  log('  - Админ-панель → Настройки → Управление кешем');
}

// Проверка, запущен ли скрипт напрямую
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { generateTimestamp, generateAppHash, updateServiceWorker, updateEnvFile };
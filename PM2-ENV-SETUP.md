# Настройка переменных окружения для PM2 на edahouse.ordis.co.il

## Проблема
PM2 не загружает файл .env автоматически, поэтому нужно настроить передачу переменных окружения в приложение.

## ✅ Решение 1: Двойная защита (рекомендуемое)

Мы настроили **двойную систему** загрузки переменных:

### 1. В коде приложения
В `server/index.ts` добавлен импорт dotenv:
```typescript
import 'dotenv/config';
```

### 2. В PM2 конфигурации  
В `ecosystem.edahouse.config.cjs` добавлены все переменные:
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
}
```

## Применение изменений на сервере

### Способ A: Обновление существующего проекта
```bash
cd /var/www/ordis_co_il_usr/data/www/edahouse.ordis.co.il

# Остановить PM2
pm2 stop edahouse

# Обновить код и пересобрать
git pull origin main
npm install
npm run build

# Запустить с обновленной конфигурацией
pm2 start ecosystem.edahouse.config.cjs
```

### Способ B: Полная переустановка (если нужно)
```bash
# Удалить старую версию
pm2 delete edahouse
rm -rf /var/www/ordis_co_il_usr/data/www/edahouse.ordis.co.il

# Установить заново с исправленными скриптами
curl -sSL https://raw.githubusercontent.com/YOUR_USERNAME/edahouse/main/scripts/install-on-vps.sh | bash -s edahouse edahouse.ordis.co.il 3000
```

## Проверка работоспособности

### 1. Проверить статус PM2
```bash
pm2 status
pm2 logs edahouse --lines 20
```

### 2. Проверить загрузку переменных
```bash
# Проверить что приложение видит переменные окружения
pm2 show edahouse
```

### 3. Тестировать API
```bash
# Локально
curl http://localhost:3000/api/health

# Через домен
curl https://edahouse.ordis.co.il/api/health
```

## Дополнительные способы (если основной не работает)

### Способ 3: Экспорт переменных в shell
```bash
cd /var/www/ordis_co_il_usr/data/www/edahouse.ordis.co.il
export $(grep -v '^#' .env | xargs)
pm2 restart edahouse --update-env
```

### Способ 4: Использование pm2-runtime
```bash
pm2-runtime start ecosystem.edahouse.config.cjs --env production
```

## Что изменилось в проекте

1. ✅ **Добавлен dotenv** в зависимости
2. ✅ **Добавлен импорт dotenv** в server/index.ts  
3. ✅ **Обновлена PM2 конфигурация** с полным набором переменных
4. ✅ **Обновлен скрипт установки** для автоматической настройки
5. ✅ **Исправлено расширение** .js → .cjs для совместимости с ES modules

## Результат

Теперь переменные окружения загружаются **двумя способами**:
- Из файла .env через dotenv (если файл существует)
- Из PM2 конфигурации (гарантированно работает)

Это обеспечивает стабильную работу приложения в любых условиях.
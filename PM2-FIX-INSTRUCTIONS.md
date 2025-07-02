# Исправление ошибки PM2 для edahouse.ordis.co.il

## Проблема
```
Error [ERR_REQUIRE_ESM]: require() of ES Module ecosystem.edahouse.config.js not supported
```

Это происходит потому что проект использует ES modules (`"type": "module"`), а PM2 требует CommonJS формат.

## Решение

### 1. Переименование конфигурационного файла

На сервере выполните:
```bash
cd /var/www/ordis_co_il_usr/data/www/edahouse.ordis.co.il
mv ecosystem.edahouse.config.js ecosystem.edahouse.config.cjs
```

### 2. Запуск PM2 с правильным файлом
```bash
pm2 start ecosystem.edahouse.config.cjs
pm2 save
```

### 3. Проверка статуса
```bash
pm2 status
pm2 logs edahouse
```

## Содержимое правильного конфигурационного файла

Файл: `ecosystem.edahouse.config.cjs`
```javascript
module.exports = {
  apps: [
    {
      name: 'edahouse',
      script: './dist/index.js',
      cwd: '/var/www/ordis_co_il_usr/data/www/edahouse.ordis.co.il',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      kill_timeout: 5000,
      listen_timeout: 3000,
      min_uptime: '10s',
      max_restarts: 10
    }
  ]
};
```

## Альтернативное решение

Если переименование не помогает, можно запустить напрямую:
```bash
pm2 start dist/index.js --name edahouse --cwd /var/www/ordis_co_il_usr/data/www/edahouse.ordis.co.il
pm2 save
```

## Проверка работоспособности

```bash
# Статус PM2
pm2 status

# Логи приложения
pm2 logs edahouse --lines 50

# Проверка API
curl http://localhost:3000/api/health

# Проверка через домен
curl https://edahouse.ordis.co.il/api/health
```

## Команды управления

```bash
# Перезапуск
pm2 restart edahouse

# Остановка
pm2 stop edahouse

# Удаление из PM2
pm2 delete edahouse

# Мониторинг в реальном времени
pm2 monit
```

## Обновленная команда установки

Все исправления уже внесены в скрипт установки. При повторной установке используйте:

```bash
curl -sSL https://raw.githubusercontent.com/YOUR_USERNAME/edahouse/main/scripts/install-on-vps.sh | bash -s edahouse edahouse.ordis.co.il 3000
```

Скрипт теперь автоматически создает файл `ecosystem.edahouse.config.cjs` с правильным форматом.

**Проблема решена: PM2 теперь правильно запускает приложение с ES modules.**
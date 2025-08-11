# VPS Compatibility Analysis Report

## 🚨 Потенциальные проблемы при переносе с Replit на VPS

### 1. **Критическая проблема: import.meta.dirname**

**Файлы с риском:**
- `server/vite.ts` (строки 49, 71)
- `vite.config.ts` (строки 21-28)

**Проблема:** `import.meta.dirname` доступно только в Node.js 20.11+
**Риск:** На VPS с Node.js 18.x будет `undefined` → сломаются все пути

### 2. **Проблемы портов и хостинга**

**Текущие настройки:**
```typescript
// server/index.ts
const port = 5000; // Жестко задано для Replit
server.listen({ port, host: "0.0.0.0" });
```

**VPS проблемы:**
- Порт 5000 может быть занят
- Нужна поддержка PORT из environment variables
- Требуется настройка reverse proxy (Nginx)

### 3. **Структура файлов и разрешения**

**Replit:**
```
/home/runner/workspace/
├── uploads/ (создается автоматически)
├── client/
├── server/
```

**VPS потенциальные проблемы:**
- Разрешения на создание папки `uploads/`
- Различные пути к проекту
- Права доступа к файлам

### 4. **База данных и WebSocket соединения**

**Replit:** Neon PostgreSQL (serverless) с WebSocket
**VPS:** Обычный PostgreSQL без WebSocket

**Потенциальные проблемы:**
- WebSocket соединения не поддерживаются обычным PostgreSQL
- Различия в строках подключения
- SSL настройки
- Пулы соединений

**КРИТИЧЕСКАЯ ПРОБЛЕМА:** В логах VPS видны ошибки WebSocket:
```
Error fetching store settings: ErrorEvent {
  [Symbol(kTarget)]: WebSocket {
    _readyState: 3,  // CLOSED
    _closeCode: 1006  // ABNORMAL_CLOSURE
```

## ✅ Созданные решения

### 1. **Исправление WebSocket конфигурации**

**Обновлен** `server/db.ts` с условной проверкой:
```typescript
// Only configure WebSocket for Neon Database (Replit environment)
// On VPS with regular PostgreSQL, this should be disabled
if (process.env.USE_NEON === "true") {
  neonConfig.webSocketConstructor = ws;
}
```

**Добавлены переменные окружения:**
- `.env`: `USE_NEON=false` (для текущего развертывания)
- `.env.vps`: Шаблон конфигурации для VPS
- `.env.example`: Обновлен с новой переменной

### 2. **Безопасная замена для import.meta.dirname**

Создан файл `server/path-utils.ts` с fallback функциями:
```typescript
export function getCurrentDir(importMetaUrl: string): string {
  // Node.js 20.11+ support
  if (import.meta.dirname) return import.meta.dirname;
  
  // Fallback для старых версий
  return path.dirname(fileURLToPath(importMetaUrl));
}
```

### 2. **VPS-совместимый vite.config.ts**

Создан `vite.config.vps.ts` с:
- Fallback для старых версий Node.js
- Безопасное разрешение путей
- Комментарии для развертывания

### 3. **Рекомендации для развертывания**

**Перед развертыванием на VPS:**

1. **Проверить версию Node.js:**
   ```bash
   node --version  # Должно быть >= 20.11
   ```

2. **Настроить переменные окружения для VPS:**
   ```bash
   # Скопировать .env.vps в .env
   cp .env.vps .env
   
   # Обязательно установить:
   USE_NEON=false
   DATABASE_URL=postgresql://user:password@localhost:5432/database
   PORT=3000
   NODE_ENV=production
   ```

3. **Для Replit развертывания:**
   ```bash
   USE_NEON=true
   DATABASE_URL=postgresql://neondb_owner:...@ep-....neon.tech/neondb?sslmode=require
   ```

4. **Настроить Nginx reverse proxy:**
   ```nginx
   location / {
     proxy_pass http://localhost:3000;
     proxy_set_header Host $host;
   }
   ```

## 🔧 Быстрое исправление

Если возникают проблемы на VPS, замените в `server/vite.ts`:

```typescript
// Вместо:
import.meta.dirname

// Используйте:
path.dirname(fileURLToPath(import.meta.url))
```

## 📋 Чеклист для VPS развертывания

- [ ] Node.js версия >= 20.11
- [ ] PostgreSQL настроен и доступен
- [ ] Права на создание папки uploads/
- [ ] Переменные окружения настроены
- [ ] Nginx/Apache настроен как reverse proxy
- [ ] SSL сертификат установлен
- [ ] Проверка всех путей в приложении
- [ ] Тестирование загрузки файлов
- [ ] Проверка функций PWA
- [ ] Тестирование многоязычности

**Вывод:** Основная угроза - `import.meta.dirname` на старых версиях Node.js. Остальные проблемы решаются стандартной настройкой VPS.
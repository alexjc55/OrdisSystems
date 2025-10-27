# План миграции eDAHouse на Multi-Tenant архитектуру

## Контекст проекта

**Текущее состояние:**
- eDAHouse - система доставки еды с многоязычной поддержкой (RU/EN/HE/AR)
- Один магазин = одна копия кода + одна база данных
- Развёрнуто на поддомене: edahouse.ordis.co.il

**Проблема:**
- Планируется 1000+ магазинов
- Каждый магазин требует отдельную копию кода
- Обновление кода = обновление 1000 копий (неуправляемо)
- Избыточное дублирование ресурсов

## Цель трансформации

Преобразовать систему в **SaaS платформу** для поддержки 1000+ независимых магазинов:
- ✅ Каждый магазин на своём поддомене: `shop1.ordis.co.il`, `shop2.ordis.co.il`
- ✅ Поддержка custom domains: `edahouse.com`, `myshop.com`
- ✅ Единая кодовая база для всех магазинов
- ✅ Централизованные обновления (обновили код один раз → все магазины обновлены)
- ✅ Полная изоляция данных между магазинами
- ✅ Изоляция файлов (uploads) между магазинами

## Архитектурные решения

### 1. Стратегия базы данных: Один код → Несколько БД

```
Один код на сервере (Node.js + Express)
  ├── master_db (управление tenants)
  ├── db_cluster_1 (магазины 1-100)
  ├── db_cluster_2 (магазины 101-200)
  └── db_cluster_N (магазины N01-N00)
```

**Почему несколько БД, а не одна:**
- ✅ Изоляция данных между группами магазинов
- ✅ Балансировка нагрузки
- ✅ Отказоустойчивость (если одна БД падает, другие работают)
- ✅ Масштабируемость (легко добавить новый кластер)
- ✅ Безопасность (взлом одной БД не затрагивает все магазины)

**Почему не одна БД с tenant_id:**
- ❌ Высокая нагрузка на одну БД при 1000 магазинах
- ❌ Single point of failure (упала БД = упали все магазины)
- ❌ Сложнее масштабировать

### 2. Tenant Identification (определение магазина по домену)

#### Master Database Schema

```sql
-- Master БД для управления всеми tenants
CREATE TABLE tenants (
  id SERIAL PRIMARY KEY,
  subdomain VARCHAR(100) UNIQUE NOT NULL,       -- shop1, shop2, edahouse
  custom_domain VARCHAR(255) UNIQUE,           -- edahouse.com, myshop.com (опционально)
  db_cluster VARCHAR(50) NOT NULL,             -- cluster_1, cluster_2
  store_name VARCHAR(255),                     -- Название магазина
  is_active BOOLEAN DEFAULT true,              -- Активен ли магазин
  plan_type VARCHAR(50) DEFAULT 'basic',       -- basic, premium, enterprise
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Примеры записей:
-- id=1, subdomain="edahouse", custom_domain="edahouse.com", db_cluster="cluster_1", is_active=true
-- id=2, subdomain="shop2", custom_domain=NULL, db_cluster="cluster_1", is_active=true
-- id=3, subdomain="shop3", custom_domain="myshop.com", db_cluster="cluster_2", is_active=true

CREATE TABLE db_clusters (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,            -- cluster_1, cluster_2
  connection_string TEXT NOT NULL,             -- DATABASE_URL для этого кластера
  max_tenants INTEGER DEFAULT 100,             -- Максимум магазинов на кластер
  current_tenants INTEGER DEFAULT 0,           -- Текущее количество магазинов
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Tenant Detection Middleware

```typescript
// server/middleware/tenant.ts

import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';

interface Tenant {
  id: number;
  subdomain: string;
  custom_domain: string | null;
  db_cluster: string;
  store_name: string;
  is_active: boolean;
}

// Master DB connection для tenant lookup
const masterDb = new Pool({
  connectionString: process.env.MASTER_DB_URL
});

export async function tenantMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const hostname = req.hostname;
    let tenant: Tenant | null = null;
    
    // Определяем: поддомен или custom domain
    if (hostname.endsWith('.ordis.co.il')) {
      // Поддомен: shop1.ordis.co.il
      const subdomain = hostname.split('.')[0];
      const result = await masterDb.query(
        'SELECT * FROM tenants WHERE subdomain = $1 AND is_active = true',
        [subdomain]
      );
      tenant = result.rows[0];
    } else {
      // Custom domain: edahouse.com
      const result = await masterDb.query(
        'SELECT * FROM tenants WHERE custom_domain = $1 AND is_active = true',
        [hostname]
      );
      tenant = result.rows[0];
    }
    
    if (!tenant) {
      return res.status(404).json({ 
        error: 'Store not found',
        message: 'This store does not exist or has been deactivated'
      });
    }
    
    // Сохраняем tenant в request для использования во всех роутах
    req.tenant = tenant;
    
    // Получаем DB connection для этого tenant
    req.db = getDbConnection(tenant.db_cluster);
    
    next();
  } catch (error) {
    console.error('Tenant middleware error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Расширяем типы Express
declare global {
  namespace Express {
    interface Request {
      tenant?: Tenant;
      db?: Pool;
    }
  }
}
```

### 3. Database Connection Manager

```typescript
// server/db-manager.ts

import { Pool } from 'pg';

// Пулы соединений для каждого кластера БД
const dbPools: Record<string, Pool> = {};

// Инициализация пулов при старте приложения
export function initDbPools() {
  // Загружаем конфигурацию кластеров из env
  const clusters = [
    { name: 'cluster_1', url: process.env.DB_CLUSTER_1_URL },
    { name: 'cluster_2', url: process.env.DB_CLUSTER_2_URL },
    // ... добавить по необходимости
  ];
  
  clusters.forEach(cluster => {
    if (cluster.url) {
      dbPools[cluster.name] = new Pool({
        connectionString: cluster.url,
        max: 20, // Максимум 20 соединений на кластер
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });
      console.log(`✅ DB Pool initialized for ${cluster.name}`);
    }
  });
}

// Получить соединение для конкретного кластера
export function getDbConnection(clusterName: string): Pool {
  const pool = dbPools[clusterName];
  
  if (!pool) {
    throw new Error(`Database cluster "${clusterName}" not found`);
  }
  
  return pool;
}

// Graceful shutdown всех пулов
export async function closeAllPools() {
  const promises = Object.values(dbPools).map(pool => pool.end());
  await Promise.all(promises);
  console.log('All database pools closed');
}
```

### 4. Изоляция файлов (uploads)

```typescript
// server/upload-manager.ts

import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Структура папок:
// uploads/
//   ├── tenant_1/
//   │   ├── products/
//   │   ├── logos/
//   │   └── banners/
//   ├── tenant_2/
//   └── tenant_N/

export function getTenantUploadPath(tenantId: number, category: string): string {
  const basePath = path.join(process.cwd(), 'uploads', `tenant_${tenantId}`, category);
  
  // Создать папку если не существует
  if (!fs.existsSync(basePath)) {
    fs.mkdirSync(basePath, { recursive: true });
  }
  
  return basePath;
}

// Multer конфигурация с tenant isolation
export function createTenantStorage(category: string) {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      if (!req.tenant) {
        return cb(new Error('Tenant not found'), '');
      }
      const uploadPath = getTenantUploadPath(req.tenant.id, category);
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  });
}

// Проверка доступа к файлу (только свой tenant)
export function checkFileAccess(tenantId: number, filePath: string): boolean {
  const allowedPath = path.join(process.cwd(), 'uploads', `tenant_${tenantId}`);
  const resolvedPath = path.resolve(filePath);
  return resolvedPath.startsWith(allowedPath);
}
```

## План реализации (пошаговый)

### Этап 1: Подготовка схемы БД ⭐ НАЧАТЬ С ЭТОГО

**Цель:** Создать master базу данных для управления tenants

**Задачи:**
1. Создать новую PostgreSQL базу данных `master_db`
2. Создать таблицы `tenants` и `db_clusters` (см. SQL выше)
3. Добавить Drizzle схему для master БД в `shared/schema.ts`
4. Настроить переменные окружения:
   ```env
   MASTER_DB_URL=postgresql://user:pass@host:5432/master_db
   DB_CLUSTER_1_URL=postgresql://user:pass@host:5432/cluster_1
   ```

**Тестирование:**
- Вставить тестовую запись tenant
- Проверить что можно получить tenant по subdomain

### Этап 2: Tenant Detection Middleware

**Цель:** Определять магазин по домену и загружать нужную БД

**Задачи:**
1. Создать `server/middleware/tenant.ts` (см. код выше)
2. Создать `server/db-manager.ts` для управления пулами
3. Подключить middleware в `server/index.ts`:
   ```typescript
   import { tenantMiddleware } from './middleware/tenant';
   app.use(tenantMiddleware);
   ```
4. Обновить типы Express для `req.tenant` и `req.db`

**Тестирование:**
- Запустить приложение
- Проверить что middleware определяет tenant
- Проверить что недоступный subdomain возвращает 404

### Этап 3: Модификация Storage layer

**Цель:** Все запросы идут в tenant-specific БД

**Задачи:**
1. Модифицировать `server/storage.ts`:
   - Убрать глобальный DB connection
   - Использовать `req.db` вместо глобального pool
   - Передавать db connection в каждый метод storage
   
2. Обновить все роуты в `server/routes.ts`:
   ```typescript
   // Было:
   const products = await storage.getProducts();
   
   // Стало:
   const products = await storage.getProducts(req.db);
   ```

**Тестирование:**
- Создать 2 тестовых tenant с разными БД
- Добавить продукты в каждый
- Проверить что продукты не смешиваются

### Этап 4: File Storage Isolation

**Цель:** Каждый tenant хранит файлы в своей папке

**Задачи:**
1. Создать `server/upload-manager.ts` (см. код выше)
2. Обновить Multer конфигурацию:
   ```typescript
   const upload = multer({ 
     storage: createTenantStorage('products') 
   });
   ```
3. Добавить middleware для static файлов с проверкой tenant:
   ```typescript
   app.get('/uploads/*', (req, res) => {
     if (!req.tenant) return res.status(403).send('Forbidden');
     const filePath = req.path;
     if (!checkFileAccess(req.tenant.id, filePath)) {
       return res.status(403).send('Forbidden');
     }
     res.sendFile(filePath);
   });
   ```

**Тестирование:**
- Загрузить изображение в tenant_1
- Попробовать получить файл через tenant_2 (должно вернуть 403)

### Этап 5: Session Management

**Цель:** Изоляция сессий между tenants

**Задачи:**
1. Обновить session store:
   ```typescript
   app.use(session({
     store: new PgStore({
       pool: masterDb, // Сессии в master DB
       tableName: 'sessions'
     }),
     genid: (req) => {
       // Включаем tenant_id в session key
       return `${req.tenant?.id}_${uuid()}`;
     },
     // ...
   }));
   ```

2. Настроить cookie domain:
   ```typescript
   cookie: {
     domain: req.hostname.endsWith('.ordis.co.il') 
       ? '.ordis.co.il'  // wildcard для поддоменов
       : req.hostname     // конкретный домен
   }
   ```

**Тестирование:**
- Залогиниться в tenant_1
- Проверить что сессия не работает в tenant_2

### Этап 6: Admin Panel для Tenant Management

**Цель:** UI для создания и управления магазинами

**Задачи:**
1. Создать страницу `/admin/tenants` (только для super admin):
   - Список всех магазинов
   - Форма создания нового магазина
   - Редактирование subdomain/custom_domain
   - Активация/деактивация

2. API endpoints в `server/routes.ts`:
   ```typescript
   // GET /api/admin/tenants - список магазинов
   // POST /api/admin/tenants - создать магазин
   // PUT /api/admin/tenants/:id - обновить
   // DELETE /api/admin/tenants/:id - деактивировать
   ```

3. При создании tenant:
   - Создать запись в `tenants` таблице
   - Создать БД для tenant (или назначить существующий кластер)
   - Запустить миграции для новой БД
   - Создать папку uploads/tenant_X/

**Тестирование:**
- Создать новый магазин через admin panel
- Проверить что магазин доступен по поддомену
- Проверить что создалась папка для uploads

### Этап 7: Custom Domain Support

**Цель:** Поддержка собственных доменов для магазинов

**Nginx конфигурация:**
```nginx
server {
  # Слушать все домены
  server_name *.ordis.co.il ~^(.+)$;
  
  location / {
    proxy_pass http://localhost:5000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

**SSL сертификаты:**
1. Wildcard сертификат для `*.ordis.co.il`:
   ```bash
   certbot certonly --dns-cloudflare \
     -d '*.ordis.co.il' \
     -d 'ordis.co.il'
   ```

2. Auto-provision для custom domains (Let's Encrypt):
   ```bash
   certbot --nginx -d edahouse.com
   ```

**Задачи:**
1. Настроить Nginx для wildcard доменов
2. Добавить функцию в admin panel для добавления custom domain
3. Инструкция для клиентов: "Добавьте A-запись на IP X.X.X.X"

**Тестирование:**
- Добавить custom domain для tenant
- Проверить что магазин доступен по этому домену

### Этап 8: Тестирование и безопасность

**Security checklist:**
- ✅ Tenant не может читать данные другого tenant
- ✅ Tenant не может получить файлы другого tenant  
- ✅ Сессии изолированы между tenants
- ✅ SQL injection защита (prepared statements)
- ✅ Нет утечки информации в error messages

**Load testing:**
```bash
# Симулировать нагрузку от 100 магазинов
ab -n 10000 -c 100 https://shop1.ordis.co.il/
ab -n 10000 -c 100 https://shop2.ordis.co.il/
```

**Проверки:**
1. Response time < 200ms при 100 одновременных tenants
2. Memory usage стабильна
3. Connection pooling работает корректно
4. Нет утечек памяти

### Этап 9: Deployment Strategy

**Подготовка VPS:**
1. Установить несколько PostgreSQL инстансов (кластеры)
2. Настроить Nginx с wildcard доменами
3. SSL сертификаты для *.ordis.co.il

**Миграция текущего edahouse:**
1. Создать tenant запись для edahouse в master_db
2. Переключить код на новую архитектуру
3. Проверить что edahouse.ordis.co.il работает как раньше

**Rollout план:**
1. Blue-green deployment для zero downtime
2. Мониторинг (Prometheus + Grafana)
3. Alerts на Telegram/Email при ошибках

## Структура файлов проекта

```
server/
  ├── middleware/
  │   ├── tenant.ts          (NEW) - определение tenant по домену
  │   └── auth.ts            (MODIFIED) - учитывать tenant в auth
  ├── db-manager.ts          (NEW) - управление DB пулами
  ├── upload-manager.ts      (NEW) - tenant-изолированные uploads
  ├── tenant-service.ts      (NEW) - бизнес-логика для tenants
  ├── storage.ts             (MODIFIED) - использовать req.db
  ├── routes.ts              (MODIFIED) - передавать req.db в storage
  └── index.ts               (MODIFIED) - подключить tenant middleware

client/src/
  └── pages/
      └── admin-tenants.tsx  (NEW) - управление магазинами

shared/
  └── schema.ts              (MODIFIED) - добавить tenants таблицы

uploads/                     (MODIFIED)
  ├── tenant_1/
  ├── tenant_2/
  └── tenant_N/
```

## Environment Variables

```env
# Master DB (для tenant management)
MASTER_DB_URL=postgresql://user:pass@host:5432/master_db

# DB Clusters
DB_CLUSTER_1_URL=postgresql://user:pass@host:5432/cluster_1
DB_CLUSTER_2_URL=postgresql://user:pass@host:5432/cluster_2

# Session
SESSION_SECRET=your-secret-key

# Security
ALLOWED_ORIGINS=*.ordis.co.il

# Super Admin (для доступа к tenant management)
SUPER_ADMIN_EMAIL=admin@ordis.co.il
```

## Метрики успеха

- ✅ Один код обслуживает N магазинов
- ✅ Каждый магазин полностью изолирован (данные + файлы + сессии)
- ✅ Обновление кода = обновление всех магазинов одновременно
- ✅ Поддержка поддоменов: shop1.ordis.co.il, shop2.ordis.co.il
- ✅ Поддержка custom domains: edahouse.com, myshop.com
- ✅ Response time < 200ms при 100 tenants
- ✅ Zero data leakage между tenants
- ✅ Админ-панель для создания/управления магазинами

## Дальнейшее развитие (после MVP)

После успешной реализации базовой multi-tenant архитектуры:

1. **Tenant Analytics Dashboard** - общая статистика по всем магазинам
2. **Auto-scaling DB clusters** - автоматическое добавление кластеров при нагрузке
3. **Backup & Restore** - для каждого tenant отдельно
4. **Tenant-specific features** - включение/выключение функций для разных планов
5. **Billing System** - подписки и тарифы для владельцев магазинов
6. **White-label** - кастомизация брендинга для каждого магазина
7. **Multi-region support** - кластеры в разных географических зонах

## Начало работы

**Для реализации этого плана в новом Replit проекте:**

1. Прочитай весь документ целиком
2. Создай task list из Этапов 1-9
3. Начни с Этапа 1: Подготовка схемы БД
4. Тестируй каждый этап перед переходом к следующему
5. Используй architect tool для ревью критических изменений

**Первая команда агенту в новом проекте:**

```
Реализуй multi-tenant архитектуру для SaaS платформы согласно плану из файла MULTI_TENANT_MIGRATION_PLAN.md

Начни с Этапа 1: создание master базы данных и таблиц для управления tenants.

Используй PostgreSQL, TypeScript, Express.js и Drizzle ORM.
```

---

**Документ создан:** 27 октября 2025
**Проект:** eDAHouse Multi-Tenant Migration
**Цель:** Трансформация в SaaS платформу для 1000+ магазинов

Удачи! 🚀

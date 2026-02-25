# Технический обзор проекта eDAHouse / Ordis

> Актуально на: февраль 2026

---

## 1. Что это за проект

**eDAHouse** (торговая марка — **Ordis**) — SaaS-платформа для онлайн-заказов еды, ориентированная на независимые израильские продуктовые магазины и рестораны.

**Бизнес-модель:**
- 300₪/месяц + НДС (для ранних клиентов — навсегда), минимум 3 месяца
- В будущем цена вырастет до 500₪+
- Целевая аудитория: 1000+ независимых магазинов Израиля

**Основные возможности для конечного пользователя:**
- Каталог товаров с поиском и категориями
- Корзина (через Zustand, без сервера)
- Три способа оформления заказа: авторизованный, гостевой (по токену), WhatsApp
- Выбор времени доставки (по часам / по половинам дня / отключено)
- PWA: установка на телефон, push-уведомления, офлайн-режим

**Для администратора:**
- Полная панель управления: товары, категории, заказы (kanban), пользователи, настройки магазина, темы оформления
- Маркетинговые push-уведомления
- Аналитика заказов
- Управление закрытыми датами

---

## 2. Общая архитектура

Проект — **монорепозиторий** с единым `package.json`. Три зоны:

```
/
├── client/          # React-приложение (SPA / PWA)
├── server/          # Express.js backend
├── shared/          # Общие типы, схема БД, вспомогательные утилиты
└── uploads/         # Загружаемые изображения (локальный диск)
```

**Ключевая особенность архитектуры:** backend и frontend — это **один процесс Node.js** на одном порту (5000).

- В режиме **разработки**: Express обрабатывает API, Vite обрабатывает фронтенд — оба внутри одного процесса через `server/vite.ts`.
- В режиме **production**: Express обрабатывает API и раздаёт собранные статические файлы Vite из папки `dist/`.
- Для production на VPS перед Express стоит **Nginx** как reverse proxy (SSL-терминация, сжатие, отдача статики).

Нет отдельного API-сервиса. REST API встроен непосредственно в Express-сервер.

---

## 3. Структура файлов

### 3.1 Backend (`server/`)

| Файл | Назначение |
|------|-----------|
| `index.ts` | Точка входа: создаёт Express-приложение, подключает middleware, стартует сервер |
| `routes.ts` | Все ~90 REST API эндпоинтов в одном файле |
| `auth.ts` | Passport.js (Local Strategy), хэширование паролей, сессии |
| `db.ts` | Подключение к PostgreSQL (поддержка Neon serverless и обычного pg) |
| `storage.ts` | Слой доступа к данным — все SQL-запросы через Drizzle ORM |
| `storage-fixed.ts` | Резервная/альтернативная версия storage |
| `seed.ts` | Начальное заполнение БД (настройки магазина, admin-пользователь) |
| `email-service.ts` | Отправка email через SendGrid + резерв на Nodemailer |
| `push-notifications.ts` | Web Push — VAPID-ключи, рассылка уведомлений |
| `facebook-conversions-api.ts` | Facebook Conversions API — серверная передача событий |
| `feed-generator.ts` | Генерация товарных фидов: Facebook, Google, Яндекс, JSON |
| `bot-detection.ts` | Определение поисковых ботов по User-Agent |
| `meta-injection-middleware.ts` | Инъекция JSON-LD схем и meta-тегов в HTML для ботов |
| `ssr-middleware.ts` | SSR-инфраструктура (создана, но не активна в dev-режиме) |
| `translation-manager.ts` | Управление переводами через БД |
| `path-utils.ts` | Утилиты для работы с путями к файлам |
| `vite.ts` | Интеграция Vite в Express (только dev-режим) |
| `replitAuth.ts` | Заготовка для Replit OAuth (не используется основным потоком) |

### 3.2 Frontend (`client/src/`)

```
client/src/
├── App.tsx                    # Корневой компонент: роутинг, провайдеры, CartSidebar
├── main.tsx                   # Точка входа React
├── index.css                  # Глобальные стили, CSS-переменные темы
├── entry-server.tsx           # SSR-точка входа (создана, не активна в dev)
│
├── pages/                     # Страницы приложения
│   ├── home.tsx               # Главная: каталог с фильтрами
│   ├── checkout.tsx           # Оформление заказа (авторизованный)
│   ├── guest-order.tsx        # Оформление заказа (гостевой, по токену)
│   ├── auth-page.tsx          # Логин / регистрация
│   ├── admin-dashboard.tsx    # Панель администратора
│   ├── admin-analytics.tsx    # Аналитика (только admin)
│   ├── profile.tsx            # Профиль пользователя
│   ├── landing.tsx            # Лендинг-страница
│   ├── thanks.tsx             # Страница подтверждения заказа
│   ├── forgot-password.tsx    # Сброс пароля (шаг 1)
│   ├── reset-password.tsx     # Сброс пароля (шаг 2)
│   ├── change-password.tsx    # Смена пароля
│   └── not-found.tsx          # 404
│
├── components/
│   ├── cart/
│   │   ├── cart-sidebar.tsx   # ОСНОВНАЯ корзина (используется в App.tsx)
│   │   └── cart-overlay.tsx   # Устаревшая версия (не используется)
│   ├── layout/
│   │   ├── header.tsx         # Шапка: логотип, поиск, иконки
│   │   └── bottom-nav.tsx     # Нижняя навигация (мобильная)
│   ├── menu/
│   │   ├── product-card.tsx   # Карточка товара
│   │   ├── category-nav.tsx   # Горизонтальная навигация по категориям
│   │   └── sidebar.tsx        # Боковая панель с категориями
│   ├── checkout/              # Компоненты оформления заказа
│   ├── admin/                 # Компоненты панели администратора
│   ├── filters/               # Фильтры каталога
│   ├── ui/                    # shadcn/ui компоненты (Button, Input, Dialog и т.д.)
│   ├── SEOHead.tsx            # Управление meta-тегами через react-helmet-async
│   ├── UTMLink.tsx            # Навигационный компонент с сохранением UTM-параметров
│   ├── FacebookPixel.tsx      # Инициализация Facebook Pixel
│   ├── AnalyticsTracker.tsx   # Трекинг событий (Яндекс, FB, GA)
│   ├── PushNotificationRequest.tsx  # Запрос разрешения на push
│   ├── PWAInstallPrompt.tsx   # Подсказка "Установить приложение"
│   └── NotificationModal.tsx  # Модальное окно push-уведомления
│
├── hooks/                     # React-хуки
│   ├── use-auth.tsx           # Текущий пользователь, логин/логаут
│   ├── use-language.tsx       # Текущий язык, переключение
│   ├── useStoreSettings.ts    # Настройки магазина из API
│   ├── use-utm-navigate.tsx   # Навигация с сохранением UTM
│   ├── use-utm-params.tsx     # Чтение/хранение UTM-параметров
│   ├── usePWA.ts              # Service Worker, обновления
│   ├── usePushNotifications.ts # Подписка на push
│   └── useAnalytics.ts        # Отправка событий в аналитику
│
├── lib/                       # Утилиты и конфигурация
│   ├── cart.ts                # Zustand store корзины
│   ├── queryClient.ts         # TanStack Query клиент + apiRequest
│   ├── currency.ts            # Форматирование цен и количеств
│   ├── i18n.ts                # Настройка react-i18next
│   ├── design-system.css      # CSS-переменные цветов и темы
│   └── prompt-utils.ts        # Логика показа промптов PWA/Push
│
└── locales/                   # Файлы переводов
    ├── ru/translation.json    # Русский (основной)
    ├── en/translation.json    # Английский
    ├── he/translation.json    # Иврит (RTL)
    └── ar/translation.json    # Арабский (RTL)
```

### 3.3 Общий код (`shared/`)

| Файл | Назначение |
|------|-----------|
| `schema.ts` | Схема БД (Drizzle ORM), Zod-схемы валидации, TypeScript-типы |
| `localization.ts` | Хелперы для получения локализованных полей |
| `multilingual-helpers.ts` | Вспомогательные функции для многоязычности |
| `seo-schemas.ts` | JSON-LD структурированные данные (Restaurant, ItemList) |

---

## 4. База данных

**PostgreSQL** — основная СУБД.
**Drizzle ORM** — type-safe запросы, миграции через `drizzle-kit push`.

### Таблицы

| Таблица | Назначение |
|---------|-----------|
| `sessions` | Хранение пользовательских сессий (connect-pg-simple) |
| `users` | Пользователи: логин, email, телефон, роль, хэш пароля, токен сброса пароля |
| `user_addresses` | Множественные адреса доставки пользователя |
| `categories` | Категории товаров (с мультиязычными полями) |
| `products` | Товары: название, описание, цена, единица измерения, изображение, статус наличия |
| `product_categories` | Связь многие-ко-многим: товар ↔ категория |
| `orders` | Заказы: статус, адрес, телефон, метод оплаты, тип доставки, токен для гостей |
| `order_items` | Позиции заказа: товар, количество, цена на момент заказа |
| `store_settings` | Единственная запись настроек магазина (название, телефон, часы работы, слайдер, тема, аналитика и т.д.) |
| `themes` | Темы оформления (CSS-переменные, шрифты, цвета) |
| `translations` | Динамические переводы через БД (дополнение к файловым JSON) |
| `push_subscriptions` | Подписки Web Push (endpoint, ключи) |
| `marketing_notifications` | История маркетинговых push-рассылок |
| `closed_dates` | Даты, когда магазин закрыт и не принимает заказы |

**Подключение к БД:**
- Определяется через переменную окружения `DATABASE_URL`
- Поддерживает как стандартный `pg` (для VPS), так и `@neondatabase/serverless` (для Neon/Replit) — выбор автоматический

---

## 5. REST API

Все эндпоинты доступны по пути `/api/...`. Нет версионирования (v1/v2). Единый файл `server/routes.ts`.

### 5.1 Аутентификация

| Метод | Путь | Доступ | Описание |
|-------|------|--------|---------|
| POST | `/api/login` | Публичный | Вход (Passport LocalStrategy) |
| POST | `/api/register` | Публичный | Регистрация нового пользователя |
| POST | `/api/logout` | Публичный | Выход из системы |
| GET | `/api/auth/user` | Авторизованный | Текущий пользователь |
| POST | `/api/auth/change-password` | Авторизованный | Смена пароля |
| POST | `/api/auth/forgot-password` | Публичный | Запрос сброса пароля (отправка email) |
| POST | `/api/auth/reset-password` | Публичный | Сброс пароля по токену |
| POST | `/api/admin/users/:id/set-password` | Admin | Принудительная смена пароля пользователю |

### 5.2 Профиль и адреса

| Метод | Путь | Доступ | Описание |
|-------|------|--------|---------|
| PATCH | `/api/profile` | Авторизованный | Обновление профиля |
| GET | `/api/addresses` | Авторизованный | Список адресов |
| POST | `/api/addresses` | Авторизованный | Добавить адрес |
| PATCH | `/api/addresses/:id` | Авторизованный | Обновить адрес |
| DELETE | `/api/addresses/:id` | Авторизованный | Удалить адрес |
| POST | `/api/addresses/:id/set-default` | Авторизованный | Сделать адрес основным |

### 5.3 Категории

| Метод | Путь | Доступ | Описание |
|-------|------|--------|---------|
| GET | `/api/categories` | Публичный | Список категорий |
| POST | `/api/categories` | Авторизованный | Создать категорию |
| PUT | `/api/categories/:id` | Авторизованный | Обновить категорию |
| PATCH | `/api/categories/:id` | Авторизованный | Частичное обновление |
| DELETE | `/api/categories/:id` | Авторизованный | Удалить категорию |
| PUT | `/api/categories/reorder` | Авторизованный | Изменить порядок категорий |

### 5.4 Товары

| Метод | Путь | Доступ | Описание |
|-------|------|--------|---------|
| GET | `/api/products` | Публичный | Список товаров (с фильтрами) |
| GET | `/api/products/search` | Публичный | Поиск товаров |
| GET | `/api/products/:id` | Публичный | Один товар |
| GET | `/api/admin/products` | Авторизованный | Товары для admin (включая скрытые) |
| POST | `/api/products` | Авторизованный | Создать товар |
| PUT | `/api/products/:id` | Авторизованный | Обновить товар |
| PATCH | `/api/products/:id` | Авторизованный | Частичное обновление |
| PATCH | `/api/products/:id/availability` | Авторизованный | Изменить статус наличия |
| DELETE | `/api/products/:id` | Авторизованный | Удалить товар |
| POST | `/api/admin/optimize-images` | Авторизованный | Оптимизация изображений (sharp) |
| POST | `/api/upload` | Авторизованный | Загрузка изображения |

### 5.5 Заказы

| Метод | Путь | Доступ | Описание |
|-------|------|--------|---------|
| GET | `/api/orders` | Авторизованный | Все заказы (admin/worker) |
| GET | `/api/orders/my` | Авторизованный | Заказы текущего пользователя |
| POST | `/api/orders` | Публичный (с сессией) | Создать заказ (авторизованный) |
| POST | `/api/orders/guest` | Публичный | Создать гостевой заказ (возвращает токен) |
| GET | `/api/orders/guest/:token` | Публичный | Статус гостевого заказа по токену |
| POST | `/api/orders/guest/:token/send-email` | Публичный | Отправить email подтверждения гостю |
| POST | `/api/orders/claim` | Авторизованный | Привязать гостевой заказ к аккаунту |
| PATCH | `/api/orders/:id` | Авторизованный | Обновить заказ |
| PUT | `/api/orders/:id/status` | Авторизованный | Изменить статус заказа |
| POST | `/api/admin/orders` | Авторизованный | Создать заказ из admin-панели |
| GET | `/api/admin/orders` | Авторизованный | Заказы с расширенными данными |

### 5.6 Пользователи (Admin)

| Метод | Путь | Доступ | Описание |
|-------|------|--------|---------|
| GET | `/api/admin/users` | Admin | Список всех пользователей |
| POST | `/api/admin/users` | Admin | Создать пользователя |
| PUT | `/api/admin/users/:id` | Admin | Обновить пользователя |
| PATCH | `/api/admin/users/:id/role` | Admin | Изменить роль |
| GET | `/api/admin/users/:id/deletion-impact` | Admin | Что будет удалено |
| DELETE | `/api/admin/users/:id` | Admin | Удалить пользователя |

### 5.7 Настройки и темы

| Метод | Путь | Доступ | Описание |
|-------|------|--------|---------|
| GET | `/api/settings` | Публичный | Настройки магазина (публичные поля) |
| PUT | `/api/settings` | Авторизованный | Обновить настройки магазина |
| GET | `/api/manifest` | Публичный | Web App Manifest (PWA) |
| GET | `/api/favicon` | Публичный | Favicon магазина |
| GET | `/api/themes/active` | Публичный | Активная тема |
| GET | `/api/admin/themes` | Авторизованный | Все темы |
| POST | `/api/admin/themes` | Авторизованный | Создать тему |
| PUT | `/api/admin/themes/:id` | Авторизованный | Обновить тему |
| POST | `/api/admin/themes/:id/activate` | Авторизованный | Активировать тему |
| DELETE | `/api/admin/themes/:id` | Авторизованный | Удалить тему |

### 5.8 Push-уведомления

| Метод | Путь | Доступ | Описание |
|-------|------|--------|---------|
| GET | `/api/push/vapid-key` | Публичный | VAPID публичный ключ |
| POST | `/api/push/subscribe` | Публичный | Подписаться на push |
| DELETE | `/api/push/unsubscribe` | Авторизованный | Отписаться |
| POST | `/api/admin/push/marketing` | Авторизованный | Отправить маркетинговый push |
| GET | `/api/admin/push/stats` | Авторизованный | Статистика push |
| GET | `/api/admin/push/marketing` | Авторизованный | История рассылок |
| POST | `/api/admin/push/test` | Авторизованный | Тестовый push |

### 5.9 Аналитика

| Метод | Путь | Доступ | Описание |
|-------|------|--------|---------|
| GET | `/api/admin/analytics/summary` | Admin | Сводка заказов/продаж |
| GET | `/api/admin/analytics/timeseries` | Admin | Данные по времени (графики) |
| GET | `/api/admin/analytics/active-orders` | Admin | Активные заказы в реальном времени |

### 5.10 Прочие эндпоинты

| Метод | Путь | Доступ | Описание |
|-------|------|--------|---------|
| GET | `/api/health` | Публичный | Проверка работоспособности сервера |
| GET | `/api/version` | Публичный | Версия приложения (для автообновлений) |
| POST | `/api/test-email` | Авторизованный | Тест email |
| GET | `/api/translations/export` | Авторизованный | Экспорт переводов (Excel) |
| POST | `/api/translations/import` | Авторизованный | Импорт переводов (Excel) |
| GET | `/api/feed/facebook` | Публичный | Товарный фид для Facebook |
| GET | `/api/feed/google` | Публичный | Товарный фид для Google Shopping |
| GET | `/api/feed/yandex` | Публичный | Товарный фид для Яндекс.Маркет |
| GET | `/api/feed/json` | Публичный | Товарный фид в JSON |
| GET | `/api/closed-dates` | Публичный | Закрытые даты магазина |
| POST | `/api/admin/closed-dates` | Авторизованный | Добавить закрытую дату |
| DELETE | `/api/admin/closed-dates/:id` | Авторизованный | Удалить закрытую дату |
| GET | `/api/barcode/config` | Публичный | Настройки штрих-кода |
| PUT | `/api/admin/barcode/config` | Авторизованный | Обновить настройки штрих-кода |
| POST | `/api/barcode/parse` | Авторизованный | Распарсить штрих-код |
| GET | `/robots.txt` | Публичный | Правила для поисковых ботов |
| GET | `/sitemap.xml` | Публичный | XML-карта сайта |

---

## 6. Аутентификация и авторизация

### Механизм аутентификации

**Passport.js** с LocalStrategy:

1. Пользователь отправляет `POST /api/login` с `username` и `password`
2. Passport ищет пользователя в БД по имени (регистронезависимо)
3. Сравнивает пароль через `scrypt` (см. Безопасность)
4. При успехе — создаёт сессию в таблице `sessions` PostgreSQL
5. Cookie `connect.sid` сохраняется в браузере (httpOnly)

**Хранение сессий:** `connect-pg-simple` — сессии хранятся в таблице `sessions` PostgreSQL, а не в памяти процесса. Это означает, что сессии переживают перезапуск сервера.

### Роли пользователей

| Роль | Описание |
|------|---------|
| `customer` | Обычный покупатель. Видит каталог, оформляет заказы, управляет профилем |
| `worker` | Сотрудник. Может видеть и менять статусы заказов, управлять товарами |
| `admin` | Полный доступ: пользователи, настройки, темы, аналитика, push-рассылки |

### Middleware защиты

```typescript
// isAuthenticated — проверяет наличие активной сессии
function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ message: "Unauthorized" });
}

// requireAdmin — только для роли admin
function requireAdmin(req, res, next) {
  if (!req.isAuthenticated()) return res.status(401).json(...);
  if (req.user?.role !== "admin") return res.status(403).json(...);
  next();
}
```

---

## 7. Безопасность

### Хэширование паролей

Используется **scrypt** — алгоритм из стандартной библиотеки Node.js `crypto` (не bcrypt, не MD5).

```
Хранится в БД: hex(scrypt(password, salt, 64)) + "." + salt
Соль: 16 случайных байт (randomBytes)
```

**Сравнение паролей:** используется `timingSafeEqual` — защита от timing-атак (атак по времени ответа).

### Защита сессий

| Параметр | Значение | Назначение |
|---------|---------|-----------|
| `httpOnly: true` | Cookie | Cookie недоступна через JavaScript (защита от XSS) |
| `SESSION_SECRET` | Env-переменная | Подпись сессионного cookie |
| `saveUninitialized: false` | Session | Не создаёт пустые сессии |
| `secure: false` (dev) | Cookie | В production через HTTPS нужно включить `true` |

> ⚠️ **Известная проблема:** `secure: false` — в production через Nginx с SSL это нужно установить в `true`, либо доверять прокси через `app.set("trust proxy", 1)` (уже установлено).

### Загрузка файлов

- **Multer** — ограничение типов файлов, только изображения
- **Sharp** — автоматическая оптимизация/ресайз при загрузке
- Файлы хранятся в папке `uploads/` (на диске сервера)

### Входные данные

- Все запросы API валидируются через **Zod-схемы** (из `shared/schema.ts`)
- Drizzle ORM использует параметризованные запросы — защита от SQL-инъекций

### Переменные окружения

Чувствительные данные передаются только через переменные окружения:

| Переменная | Назначение |
|-----------|-----------|
| `DATABASE_URL` | Строка подключения к PostgreSQL |
| `SESSION_SECRET` | Секрет для подписи сессий |
| `SENDGRID_API_KEY` | API-ключ SendGrid для email |
| `VAPID_PUBLIC_KEY` | Публичный VAPID-ключ для Web Push |
| `VAPID_PRIVATE_KEY` | Приватный VAPID-ключ для Web Push |
| `FB_PIXEL_ACCESS_TOKEN` | Токен Facebook Conversions API |

---

## 8. Frontend

### Стек

| Технология | Роль |
|-----------|------|
| **React 18** | UI-фреймворк |
| **TypeScript** | Строгая типизация |
| **Vite** | Сборщик (dev + production build) |
| **Wouter** | Клиентский роутинг (лёгкая альтернатива React Router) |
| **TanStack Query v5** | Серверное состояние: кэш, loading, error, invalidation |
| **Zustand** | Клиентское состояние: корзина (cart.ts) |
| **react-hook-form + Zod** | Формы с валидацией |
| **Tailwind CSS** | Утилитарные CSS-классы |
| **Radix UI** | Примитивы доступных UI-компонент (shadcn/ui поверх них) |
| **react-i18next** | Мультиязычность (ru, en, he, ar) |
| **react-helmet-async** | Управление meta-тегами для SEO |
| **Framer Motion** | Анимации |
| **Lucide React** | Иконки |
| **date-fns** | Форматирование дат |
| **Recharts** | Графики в аналитике |
| **Swiper** | Слайдер баннеров |
| **@zxing/browser** | Сканер штрих-кодов через камеру |

### Корзина

Корзина живёт **только на клиенте** в Zustand store (`client/src/lib/cart.ts`). На сервере корзина не хранится — при оформлении заказа содержимое передаётся в теле запроса. Данные сохраняются в `localStorage`.

### Многоязычность

4 языка: русский (основной), английский, иврит (RTL), арабский (RTL).

- Файлы переводов: `client/src/locales/{ru,en,he,ar}/translation.json`
- Дополнительные переводы хранятся в таблице БД `translations`
- RTL-режим: определяется языком, переключает `dir="rtl"` на `<html>`
- Переключение языка возможно через URL-параметр `?lang=he`

### UTM-система

Все навигационные ссылки используют компонент `UTMLink` вместо стандартного `Link` из Wouter. UTM-параметры (utm_source, utm_medium, utm_campaign, fbclid, gclid) сохраняются в localStorage на 30 дней и прикрепляются ко всем событиям аналитики.

---

## 9. PWA и Push-уведомления

### Service Worker

- Файл: `client/public/sw.js`
- Стратегия кэширования: Cache First для статики, Network First для API
- При каждом деплое автоматически обновляется `BUILD_TIMESTAMP` (скрипт `scripts/update-sw-version.js`)
- `skipWaiting + clients.claim` — автоматическое обновление без перезагрузки страницы вручную

### Push-уведомления

- Стандарт **Web Push** с VAPID-аутентификацией
- Библиотека: `web-push` на сервере
- Подписки хранятся в таблице `push_subscriptions`
- Типы: системные (уведомление о статусе заказа) + маркетинговые (рассылка всем подписчикам)

---

## 10. SEO

### Подходы

1. **Статические meta-теги** в `index.html` — для первого обращения ботов
2. **react-helmet-async** — динамические теги при SPA-навигации
3. **Meta Injection Middleware** — для поисковых ботов (Googlebot и др.) Express перехватывает запрос и вставляет JSON-LD схемы в HTML ответ
4. **JSON-LD структурированные данные** — `Restaurant`, `ItemList` (список товаров)
5. **Все ссылки — настоящие `<a href>`** через компонент `UTMLink` — поисковики видят все страницы
6. **sitemap.xml и robots.txt** — динамически генерируются сервером

### Bot Detection

Middleware определяет поисковых ботов по User-Agent: Googlebot, bingbot, Yandex, facebot и другие. Для ботов — расширенный HTML с JSON-LD, для пользователей — стандартный SPA.

---

## 11. Аналитика

Все аналитические системы инициализируются на клиенте через настройки магазина:

| Система | Конфигурация |
|---------|-------------|
| **Яндекс Метрика** | ID счётчика из настроек магазина |
| **Facebook Pixel** | Pixel ID из настроек магазина |
| **Google Analytics** | Measurement ID из настроек магазина |
| **Facebook Conversions API** | Серверная передача событий (покупки) через `server/facebook-conversions-api.ts` |

Все системы подключаются только при наличии соответствующих ID в настройках — без ID они не активируются.

---

## 12. Email

Двойная система отправки:

1. **SendGrid** (основной) — через `@sendgrid/mail`, API-ключ из env
2. **Nodemailer** (резерв) — SMTP, используется если SendGrid недоступен

Письма отправляются при: регистрации, сбросе пароля, подтверждении заказа.

---

## 13. Деплой

### Разработка (Replit)

```
npm run dev
→ tsx server/index.ts (NODE_ENV=development)
→ Express + Vite на одном порту 5000
```

### Production (VPS)

```
npm run build
→ vite build (frontend → dist/public/)
→ esbuild server/index.ts (backend → dist/index.js)

PM2: node dist/index.js (NODE_ENV=production)
Nginx: reverse proxy → localhost:5000
```

**PM2 конфигурация:** `ecosystem.config.cjs` — форк-режим (один процесс), `NODE_ENV=production` обязателен для активации meta-injection middleware.

**Nginx** обеспечивает:
- SSL-терминацию (Let's Encrypt)
- Gzip-сжатие
- Кэш-заголовки для статики
- Проксирование на Node.js процесс

### Автоматическое обновление деплоя

Скрипт `scripts/deploy.sh`:
1. Обновляет `BUILD_TIMESTAMP` в Service Worker
2. Запускает `npm run build`
3. Перезапускает PM2

---

## 14. Структура данных заказа

Заказ проходит через статусы:

```
pending → confirmed → preparing → ready → delivering → delivered
                                                      → cancelled
```

Поле `orderMethod` определяет тип:
- `delivery` — доставка на адрес
- `pickup` — самовывоз
- `whatsapp` — заказ через WhatsApp (без обработки на сервере)

---

## 15. Известные технические долги

1. `cart-overlay.tsx` — устаревший файл корзины, не используется, но не удалён
2. `storage-fixed.ts` — дублирует `storage.ts`, назначение неясно
3. `replitAuth.ts` — заготовка OAuth, не используется в основном потоке
4. `secure: false` в cookie-настройках сессии — нужно включить для HTTPS на VPS
5. Отсутствие rate limiting на публичных эндпоинтах (login, forgot-password, guest order)
6. SSR-инфраструктура создана (`entry-server.tsx`, `ssr-middleware.ts`), но не активна из-за ограничений Vite-конфигурации
7. В корне проекта накопилось много backup-файлов и документации — требуется чистка

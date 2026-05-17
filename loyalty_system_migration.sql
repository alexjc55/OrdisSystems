-- =============================================================
-- eDAHouse — Loyalty & Coupon System
-- Полная миграция: купоны, скидки лояльности, объёмные скидки, подарок
-- Все операции идемпотентны (IF NOT EXISTS / IF NOT EXISTS column)
-- =============================================================


-- -------------------------------------------------------------
-- 1. ТАБЛИЦА КУПОНОВ
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "coupons" (
  "id"                      serial PRIMARY KEY NOT NULL,
  "code"                    varchar(50) NOT NULL,
  "description"             text,
  "discount_type"           varchar NOT NULL,                        -- 'percentage' | 'fixed'
  "discount_value"          numeric(10, 2) NOT NULL,
  "min_order_amount"        numeric(10, 2) DEFAULT '0',
  "max_uses"                integer,                                  -- NULL = без лимита
  "current_uses"            integer DEFAULT 0 NOT NULL,
  "usage_type"              varchar(20) NOT NULL DEFAULT 'multi',     -- 'multi' | 'single' | 'per_customer'
  "scope"                   varchar(20) NOT NULL DEFAULT 'order',     -- 'order' | 'product'
  "target_customer_email"   varchar(255),                             -- устаревший одиночный email
  "target_user_id"          varchar(255) REFERENCES "users"("id"),    -- устаревший одиночный user_id
  "applicable_product_ids"  jsonb,                                    -- массив product_id для scope='product'
  "stacks_with_loyalty"     boolean NOT NULL DEFAULT false,           -- суммировать со скидкой лояльности
  "target_customer_emails"  jsonb,                                    -- массив email (мультицелевой)
  "target_user_ids"         jsonb,                                    -- массив user_id (мультицелевой)
  "is_active"               boolean DEFAULT true NOT NULL,
  "expires_at"              timestamp,
  "created_at"              timestamp DEFAULT now(),
  "updated_at"              timestamp DEFAULT now(),
  CONSTRAINT "coupons_code_unique" UNIQUE("code")
);

-- Добавить недостающие колонки если таблица уже существует
ALTER TABLE "coupons" ADD COLUMN IF NOT EXISTS "usage_type"             varchar(20) NOT NULL DEFAULT 'multi';
ALTER TABLE "coupons" ADD COLUMN IF NOT EXISTS "scope"                  varchar(20) NOT NULL DEFAULT 'order';
ALTER TABLE "coupons" ADD COLUMN IF NOT EXISTS "target_customer_email"  varchar(255);
ALTER TABLE "coupons" ADD COLUMN IF NOT EXISTS "target_user_id"         varchar(255) REFERENCES "users"("id");
ALTER TABLE "coupons" ADD COLUMN IF NOT EXISTS "applicable_product_ids" jsonb;
ALTER TABLE "coupons" ADD COLUMN IF NOT EXISTS "stacks_with_loyalty"    boolean NOT NULL DEFAULT false;
ALTER TABLE "coupons" ADD COLUMN IF NOT EXISTS "target_customer_emails" jsonb;
ALTER TABLE "coupons" ADD COLUMN IF NOT EXISTS "target_user_ids"        jsonb;


-- -------------------------------------------------------------
-- 2. ТАБЛИЦА ИСТОРИИ ИСПОЛЬЗОВАНИЯ КУПОНОВ
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "coupon_uses" (
  "id"        serial PRIMARY KEY NOT NULL,
  "coupon_id" integer NOT NULL REFERENCES "coupons"("id"),
  "order_id"  integer NOT NULL REFERENCES "orders"("id"),
  "user_id"   varchar REFERENCES "users"("id"),
  "used_at"   timestamp DEFAULT now()
);


-- -------------------------------------------------------------
-- 3. ТАБЛИЦА ОБЪЁМНЫХ СКИДОК НА ТОВАРЫ
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "product_volume_discounts" (
  "id"             serial PRIMARY KEY NOT NULL,
  "product_id"     integer NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
  "min_quantity"   numeric(10, 3) NOT NULL,                -- минимальное кол-во для активации скидки
  "discount_type"  varchar NOT NULL,                       -- 'percentage' | 'fixed'
  "discount_value" numeric(10, 2) NOT NULL,
  "is_active"      boolean DEFAULT true NOT NULL,
  "created_at"     timestamp DEFAULT now(),
  "updated_at"     timestamp DEFAULT now()
);


-- -------------------------------------------------------------
-- 4. НОВЫЕ КОЛОНКИ В ТАБЛИЦЕ ЗАКАЗОВ
-- -------------------------------------------------------------
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "coupon_code"      varchar(50);
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "coupon_discount"  numeric(10, 2);
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "loyalty_discount" numeric(10, 2);
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "gift_product_id"  integer;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "discount_details" jsonb;  -- детализация скидок в JSON


-- -------------------------------------------------------------
-- 5. НОВЫЕ КОЛОНКИ В ТАБЛИЦЕ НАСТРОЕК МАГАЗИНА
-- -------------------------------------------------------------

-- Скидка постоянного клиента
ALTER TABLE "store_settings" ADD COLUMN IF NOT EXISTS "loyalty_discount_enabled" boolean DEFAULT false;
ALTER TABLE "store_settings" ADD COLUMN IF NOT EXISTS "loyalty_discount_percent" numeric(5, 2) DEFAULT '0';

-- Бесплатный подарок за сумму заказа
ALTER TABLE "store_settings" ADD COLUMN IF NOT EXISTS "gift_enabled"          boolean DEFAULT false;
ALTER TABLE "store_settings" ADD COLUMN IF NOT EXISTS "gift_product_id"       integer;
ALTER TABLE "store_settings" ADD COLUMN IF NOT EXISTS "gift_min_order_amount" numeric(10, 2) DEFAULT '300';


-- =============================================================
-- ИТОГ: что добавляет эта миграция
-- =============================================================
--
-- ТАБЛИЦЫ:
--   coupons                  — купоны (коды, типы, лимиты, область применения)
--   coupon_uses              — история применения купонов к заказам
--   product_volume_discounts — объёмные скидки за кол-во товара
--
-- КОЛОНКИ В orders:
--   coupon_code      — применённый купон
--   coupon_discount  — сумма скидки по купону
--   loyalty_discount — сумма скидки постоянного клиента
--   gift_product_id  — id товара-подарка
--   discount_details — полная детализация скидок (jsonb)
--
-- КОЛОНКИ В store_settings:
--   loyalty_discount_enabled — включена ли скидка постоянного клиента
--   loyalty_discount_percent — процент скидки постоянного клиента
--   gift_enabled             — включена ли функция подарка
--   gift_product_id          — id товара-подарка
--   gift_min_order_amount    — мин. сумма заказа для получения подарка
--
-- ЛОГИКА КУПОНОВ:
--   usage_type = 'multi'        — многократный, до max_uses использований всего
--   usage_type = 'single'       — одноразовый глобально (первый применивший блокирует)
--   usage_type = 'per_customer' — каждый зарегистрированный клиент по 1 разу
--   scope = 'order'             — скидка на весь заказ
--   scope = 'product'           — скидка только на applicable_product_ids
--   stacks_with_loyalty = true  — купон суммируется со скидкой лояльности
-- =============================================================

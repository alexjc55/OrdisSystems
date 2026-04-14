-- =============================================================================
-- MIGRATION: Multi-branch support
-- Safe to run on existing databases (uses IF NOT EXISTS guards)
-- Run with: psql $DATABASE_URL -f migration_branches.sql
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Таблица филиалов (branches)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS branches (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    name_en     VARCHAR(255),
    name_he     VARCHAR(255),
    name_ar     VARCHAR(255),
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order  INTEGER DEFAULT 0,
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 2. Привязка пользователей к филиалам (user_branches)
--    Используется для ограничения доступа воркеров к конкретным филиалам
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_branches (
    id          SERIAL PRIMARY KEY,
    user_id     VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    branch_id   INTEGER NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    CONSTRAINT user_branches_user_id_branch_id_unique UNIQUE (user_id, branch_id)
);

-- -----------------------------------------------------------------------------
-- 3. Доступность продуктов по филиалам (product_branch_availability)
--    Позволяет переопределять статус продукта отдельно для каждого филиала
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_branch_availability (
    id                  SERIAL PRIMARY KEY,
    product_id          INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    branch_id           INTEGER NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    is_available        BOOLEAN NOT NULL DEFAULT TRUE,
    stock_status        VARCHAR(50) NOT NULL DEFAULT 'in_stock'
                            CHECK (stock_status IN ('in_stock', 'low_stock', 'out_of_stock')),
    availability_status VARCHAR(50) NOT NULL DEFAULT 'available'
                            CHECK (availability_status IN ('available', 'out_of_stock_today', 'completely_unavailable')),
    created_at          TIMESTAMP DEFAULT NOW(),
    updated_at          TIMESTAMP DEFAULT NOW(),
    CONSTRAINT product_branch_availability_product_id_branch_id_unique UNIQUE (product_id, branch_id)
);

-- -----------------------------------------------------------------------------
-- 4. Колонка branch_id в таблице orders (если ещё не существует)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'orders' AND column_name = 'branch_id'
    ) THEN
        ALTER TABLE orders
            ADD COLUMN branch_id INTEGER REFERENCES branches(id);
        RAISE NOTICE 'Added branch_id column to orders table';
    ELSE
        RAISE NOTICE 'branch_id column already exists in orders table — skipping';
    END IF;
END;
$$;

COMMIT;

-- =============================================================================
-- Проверка результата:
-- =============================================================================
SELECT 'branches'                    AS table_name, COUNT(*) AS rows FROM branches
UNION ALL
SELECT 'user_branches',               COUNT(*) FROM user_branches
UNION ALL
SELECT 'product_branch_availability', COUNT(*) FROM product_branch_availability
UNION ALL
SELECT 'orders (with branch_id)',      COUNT(*) FROM orders WHERE branch_id IS NOT NULL;

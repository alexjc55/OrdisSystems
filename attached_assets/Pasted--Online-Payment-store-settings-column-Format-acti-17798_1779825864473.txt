-- ─── Online Payment: store_settings column ────────────────────────────────────
-- Format: { "active": "none"|"hyp", "hyp": { "masof": "", "passP": "", "key": "", "testMode": true } }
ALTER TABLE store_settings
  ADD COLUMN IF NOT EXISTS payment_provider_config JSONB;

-- ─── Pending Payments table ───────────────────────────────────────────────────
-- Временное хранилище заказа до подтверждения оплаты шлюзом
CREATE TABLE IF NOT EXISTS pending_payments (
  id             SERIAL       PRIMARY KEY,
  token          VARCHAR(128) NOT NULL UNIQUE,   -- UUID, передаётся шлюзу и возвращается в callback
  order_data     JSONB        NOT NULL,           -- снапшот заказа (InsertOrder)
  order_items    JSONB        NOT NULL,           -- снапшот корзины
  user_id        VARCHAR      REFERENCES users(id), -- NULL для гостей
  status         VARCHAR(20)  NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','completed','failed','expired')),
  transaction_id VARCHAR(255),                   -- ID транзакции от платёжного шлюза
  created_at     TIMESTAMP    DEFAULT NOW(),
  expires_at     TIMESTAMP    NOT NULL            -- авто-истечение через 3 часа
);

CREATE INDEX IF NOT EXISTS idx_pending_payments_token
  ON pending_payments (token);

CREATE INDEX IF NOT EXISTS idx_pending_payments_expires_at
  ON pending_payments (expires_at);

-- Выбор вывода рядом с лого ───────────────────────────────────────────────────
ALTER TABLE themes ADD COLUMN IF NOT EXISTS logo_text_mode VARCHAR(20) DEFAULT 'storeName';
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS logo_text_mode VARCHAR(20) DEFAULT 'storeName';



-- Variant A: Remove NOT NULL from base name fields
-- Run this on each site's database

ALTER TABLE categories ALTER COLUMN name DROP NOT NULL;
ALTER TABLE products ALTER COLUMN name DROP NOT NULL;
ALTER TABLE branches ALTER COLUMN name DROP NOT NULL;
ALTER TABLE themes ALTER COLUMN name DROP NOT NULL;

-- Добавить колонку language_order в store_settings
ALTER TABLE store_settings
  ADD COLUMN IF NOT EXISTS language_order jsonb DEFAULT '["ru","en","he","ar"]'::jsonb;

-- Инициализировать из enabled_languages для существующих строк
UPDATE store_settings
SET language_order = enabled_languages
WHERE language_order IS NULL
   OR language_order = '[]'::jsonb;

-- Если enabled_languages тоже пустой — проставить дефолт
UPDATE store_settings
SET language_order = '["ru","en","he","ar"]'::jsonb
WHERE language_order IS NULL
   OR language_order = '[]'::jsonb;
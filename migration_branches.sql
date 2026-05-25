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
ALTER TABLE store_settings
ADD COLUMN IF NOT EXISTS payment_provider VARCHAR(20) DEFAULT 'none',
ADD COLUMN IF NOT EXISTS hyp_masof      VARCHAR(50),
ADD COLUMN IF NOT EXISTS hyp_signature  VARCHAR(255),
ADD COLUMN IF NOT EXISTS hyp_pass_p     VARCHAR(255),
ADD COLUMN IF NOT EXISTS hyp_test_mode  BOOLEAN DEFAULT true;

CREATE TABLE IF NOT EXISTS pending_payments (
  id                 SERIAL PRIMARY KEY,
  token              VARCHAR(128) NOT NULL UNIQUE,
  order_data         JSONB        NOT NULL,
  order_items        JSONB        NOT NULL,
  user_id            VARCHAR      REFERENCES users(id),
  status             VARCHAR(20)  NOT NULL DEFAULT 'pending',
  hyp_transaction_id VARCHAR(255),
  created_at         TIMESTAMP    DEFAULT NOW(),
  expires_at         TIMESTAMP    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pending_payments_token
  ON pending_payments(token);

CREATE INDEX IF NOT EXISTS idx_pending_payments_expires_at
  ON pending_payments(expires_at);
-- Apply before deploying the outbox-enabled payment handlers.
-- Do not backfill old orders: their previous email delivery is unknown.
CREATE TABLE IF NOT EXISTS payment_email_outbox (
  id serial PRIMARY KEY,
  order_id integer NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  audience varchar NOT NULL CHECK (audience IN ('admin', 'guest')),
  recipient text NOT NULL,
  status varchar NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  attempts integer NOT NULL DEFAULT 0,
  available_at timestamp NOT NULL DEFAULT now(),
  created_at timestamp NOT NULL DEFAULT now(),
  sent_at timestamp,
  last_error text,
  CONSTRAINT payment_email_outbox_order_audience_key UNIQUE (order_id, audience)
);
CREATE INDEX IF NOT EXISTS payment_email_outbox_due_idx
  ON payment_email_outbox(status, available_at);

CREATE TABLE IF NOT EXISTS payments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key       TEXT NOT NULL UNIQUE,
  amount                INTEGER NOT NULL CHECK (amount > 0),
  phone                 TEXT NOT NULL,
  account_reference     TEXT NOT NULL,
  description           TEXT,
  status                TEXT NOT NULL DEFAULT 'PENDING',
  checkout_request_id   TEXT UNIQUE,
  merchant_request_id   TEXT,
  mpesa_receipt         TEXT,
  result_code           INTEGER,
  result_desc           TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS callbacks_raw (
  id          SERIAL PRIMARY KEY,
  payload     JSONB NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS api_clients (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  key_hash    TEXT NOT NULL UNIQUE,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS webhook_url TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS webhook_delivered_at TIMESTAMPTZ;
ALTER TABLE api_clients ADD COLUMN IF NOT EXISTS webhook_secret TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS client_id INTEGER REFERENCES api_clients(id);
ALTER TABLE api_clients ADD COLUMN IF NOT EXISTS mpesa_shortcode TEXT;
ALTER TABLE api_clients ADD COLUMN IF NOT EXISTS mpesa_type TEXT;
ALTER TABLE api_clients ADD COLUMN IF NOT EXISTS mpesa_passkey_enc TEXT;
ALTER TABLE api_clients ADD COLUMN IF NOT EXISTS mpesa_consumer_key_enc TEXT;
ALTER TABLE api_clients ADD COLUMN IF NOT EXISTS mpesa_consumer_secret_enc TEXT;
ALTER TABLE api_clients ADD COLUMN IF NOT EXISTS mpesa_env TEXT;
ALTER TABLE api_clients ADD COLUMN IF NOT EXISTS mpesa_till_number TEXT;
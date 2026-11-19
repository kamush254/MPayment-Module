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
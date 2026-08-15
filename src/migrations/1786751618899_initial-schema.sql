CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  wallet_number text NOT NULL,
  photo_public_id text NOT NULL,
  photo_version text,
  phone_enc bytea NOT NULL,
  phone_last4 text NOT NULL,
  phone_hash bytea NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  is_paid boolean DEFAULT false,
  paid_at timestamptz,
  marked_by_email text,
  CONSTRAINT chk_wallet_number_format
    CHECK (wallet_number ~ '^[0-9]{3}$' AND wallet_number::int BETWEEN 1 AND 840)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_participants_wallet_number
  ON participants (wallet_number);

CREATE OR REPLACE VIEW participants_masked AS
SELECT
  id,
  name,
  wallet_number,
  photo_public_id,
  photo_version,
  ('***_***_' || phone_last4) AS phone_masked,
  created_at
FROM participants
ORDER BY created_at DESC;

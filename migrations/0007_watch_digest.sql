-- Digest diário da watch + resumo factual de movers 24h.
-- Preferências por token de push (mesma unidade do scan de alertas).

ALTER TABLE push_subscriptions
  ADD COLUMN IF NOT EXISTS digest_enabled   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS digest_hour_utc  SMALLINT NOT NULL DEFAULT 12,
  ADD COLUMN IF NOT EXISTS include_movers   BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_digest_at   TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'push_subscriptions_digest_hour_utc_check'
  ) THEN
    ALTER TABLE push_subscriptions
      ADD CONSTRAINT push_subscriptions_digest_hour_utc_check
      CHECK (digest_hour_utc >= 0 AND digest_hour_utc <= 23);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS push_subscriptions_digest_due_idx
  ON push_subscriptions (digest_enabled, digest_hour_utc)
  WHERE digest_enabled = true;

-- Subscriptions de push Expo (alertas de prevenção).
-- Uma linha por token de dispositivo; watches/rules/last_sent em JSONB.

CREATE TABLE IF NOT EXISTS push_subscriptions (
  token       TEXT PRIMARY KEY,
  platform    TEXT NOT NULL DEFAULT 'unknown',
  watches     JSONB NOT NULL DEFAULT '[]'::jsonb,
  rules       JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_sent   JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS push_subscriptions_updated_at_idx
  ON push_subscriptions (updated_at DESC);

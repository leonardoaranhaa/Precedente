-- Associa subscription de push a um userId (sessão no register).
-- Usado para alertas operacionais (ex.: cota de print), não para coaching.

ALTER TABLE push_subscriptions
  ADD COLUMN IF NOT EXISTS user_id TEXT;

CREATE INDEX IF NOT EXISTS push_subscriptions_user_id_idx
  ON push_subscriptions (user_id)
  WHERE user_id IS NOT NULL;

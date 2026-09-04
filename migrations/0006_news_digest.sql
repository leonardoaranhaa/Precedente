-- Digest diário de notícias (estilo automação agendada).
-- digest_enabled + horário UTC; last_digest_at evita reenvio no mesmo dia;
-- digest_tokens guarda Expo tokens do usuário logado (push não tem user_id).

ALTER TABLE user_news_preferences
  ADD COLUMN IF NOT EXISTS digest_enabled  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS digest_hour_utc SMALLINT NOT NULL DEFAULT 12,
  ADD COLUMN IF NOT EXISTS last_digest_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS digest_tokens   JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Hora 0–23; constraint barata (evita valor absurdo em update manual).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_news_preferences_digest_hour_utc_check'
  ) THEN
    ALTER TABLE user_news_preferences
      ADD CONSTRAINT user_news_preferences_digest_hour_utc_check
      CHECK (digest_hour_utc >= 0 AND digest_hour_utc <= 23);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS user_news_preferences_digest_due_idx
  ON user_news_preferences (digest_enabled, digest_hour_utc)
  WHERE digest_enabled = true;

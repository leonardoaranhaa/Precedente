-- Digest diário de notícias (automação estilo Grok Automations).
-- Preferências estendidas + histórico de runs por usuário/dia local.

ALTER TABLE user_news_preferences
  ADD COLUMN IF NOT EXISTS digest_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS digest_hour smallint NOT NULL DEFAULT 8,
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'America/Sao_Paulo',
  ADD COLUMN IF NOT EXISTS push_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS push_token text;

CREATE TABLE IF NOT EXISTS news_digests (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
  run_date     DATE NOT NULL,
  item_ids     JSONB NOT NULL DEFAULT '[]'::jsonb,
  titles       JSONB NOT NULL DEFAULT '[]'::jsonb,
  item_count   INT NOT NULL DEFAULT 0,
  pushed       boolean NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, run_date)
);

CREATE INDEX IF NOT EXISTS news_digests_user_created_idx
  ON news_digests (user_id, created_at DESC);

-- Preferências de notícias por usuário (protótipo do módulo de notícias).
-- Uma linha por usuário; coins/categories em JSONB (arrays de string).

CREATE TABLE IF NOT EXISTS user_news_preferences (
  user_id     TEXT PRIMARY KEY,
  coins       JSONB NOT NULL DEFAULT '[]'::jsonb,
  categories  JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sincronização de watch/histórico entre aparelhos (login opcional).
-- Uma linha por usuário por tipo de dado; o corpo inteiro (mesma forma que já
-- vive no localStorage/AsyncStorage) fica em JSONB — sem conta, tudo continua
-- só local, essa tabela nunca é tocada.

CREATE TABLE IF NOT EXISTS user_sync_data (
  user_id     TEXT NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
  kind        TEXT NOT NULL CHECK (kind IN ('watch', 'history')),
  data        JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, kind)
);

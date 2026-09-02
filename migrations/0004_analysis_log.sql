-- Observabilidade mínima: uma linha por análise concluída. Sem isso não dá
-- pra responder "quantas leituras de print rodaram essa semana e quanto
-- custou" sem abrir código — bloqueava qualquer decisão de preço do Stripe.

CREATE TABLE IF NOT EXISTS analysis_log (
  id            BIGSERIAL PRIMARY KEY,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  ticker        TEXT NOT NULL,
  timeframe     TEXT NOT NULL,
  has_image     BOOLEAN NOT NULL,
  duration_ms   INTEGER NOT NULL,
  matches       INTEGER NOT NULL,
  sample_note   TEXT NOT NULL,
  relaxed       BOOLEAN NOT NULL,
  source        TEXT NOT NULL,
  vision_cost_usd NUMERIC(10, 6) NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS analysis_log_created_at_idx ON analysis_log (created_at);
CREATE INDEX IF NOT EXISTS analysis_log_has_image_idx ON analysis_log (has_image);

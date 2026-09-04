-- Opt-in do resumo diário combinado (watch + notícias num único push).
-- Mutuamente exclusivo do digest de watch isolado por desenho: quem liga
-- este, scanWatchDigests para de mandar o digest de watch separado pra ele
-- (ver docs/push-alerts.md).

ALTER TABLE push_subscriptions
  ADD COLUMN IF NOT EXISTS daily_summary_enabled BOOLEAN NOT NULL DEFAULT false;

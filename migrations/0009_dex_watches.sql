-- Lista de tickers DEX (sem timeframe — não têm candles) que o usuário
-- pinou pra receber alerta de drenagem. Separada de `watches` de propósito:
-- WatchTarget exige ticker+timeframe, e forçar um timeframe falso num token
-- que não tem candle seria mentir no schema.

ALTER TABLE push_subscriptions
  ADD COLUMN IF NOT EXISTS dex_watches jsonb DEFAULT '[]'::jsonb;

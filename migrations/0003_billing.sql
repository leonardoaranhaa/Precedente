-- Assinatura premium (Stripe). Ninguém tem plan='premium' até o Stripe estar
-- ligado e um checkout real ser concluído — não existe caminho pra criar uma
-- linha aqui fora do webhook (src/routes/api/billing/webhook.ts).

CREATE TABLE IF NOT EXISTS user_entitlements (
  user_id                 TEXT PRIMARY KEY REFERENCES "user" (id) ON DELETE CASCADE,
  plan                    TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'premium')),
  status                  TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('inactive', 'active', 'past_due', 'canceled')),
  stripe_customer_id      TEXT,
  stripe_subscription_id  TEXT,
  current_period_end      TIMESTAMPTZ,
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_entitlements_stripe_customer_idx
  ON user_entitlements (stripe_customer_id);

CREATE INDEX IF NOT EXISTS user_entitlements_stripe_subscription_idx
  ON user_entitlements (stripe_subscription_id);

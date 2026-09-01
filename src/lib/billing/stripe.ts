import Stripe from "stripe";

/**
 * Client Stripe sob demanda. Sem STRIPE_SECRET_KEY (Stripe ainda não
 * conectado), toda rota de billing volta um erro claro em vez de deixar o
 * app quebrar — mesmo padrão de "Leitura visual indisponível" que a chave
 * da Anthropic já usa em src/lib/analyze.ts.
 */
export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("Pagamento indisponível neste ambiente.");
  }
  return new Stripe(key);
}

/** Price id do plano premium — configurado no Stripe Dashboard, não no código. */
export function getPremiumPriceId(): string {
  const id = process.env.STRIPE_PREMIUM_PRICE_ID;
  if (!id) {
    throw new Error("Plano premium ainda não configurado (STRIPE_PREMIUM_PRICE_ID).");
  }
  return id;
}

export function getWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("Webhook do Stripe ainda não configurado (STRIPE_WEBHOOK_SECRET).");
  }
  return secret;
}

import * as Sentry from "@sentry/node";

/**
 * Sem `SENTRY_DSN`, tudo aqui vira no-op — mesmo padrão do resto do app
 * (Stripe, Vision): a chave falta, o recurso some, o app continua de pé.
 */
let initialized = false;

function ensureInit(): void {
  if (initialized) return;
  initialized = true;
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? "development",
    // Só captura de erro por enquanto — sem tracing/profiling, que custa
    // volume de evento sem responder "por que quebrou".
    tracesSampleRate: 0,
  });
}

/** Reporta um erro inesperado do servidor. Contexto vira uma tag pra filtrar no Sentry. */
export function reportServerError(err: unknown, context?: Record<string, string>): void {
  ensureInit();
  if (!process.env.SENTRY_DSN) return;
  Sentry.captureException(err, context ? { tags: context } : undefined);
}

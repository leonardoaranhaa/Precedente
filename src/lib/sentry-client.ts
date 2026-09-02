import * as Sentry from "@sentry/react";

/**
 * Sem `VITE_SENTRY_DSN`, no-op — mesmo padrão do servidor
 * (`src/lib/sentry.server.ts`). Só roda no navegador: este módulo é
 * importado por `__root.tsx`, que também renderiza no servidor (SSR).
 */
export function initSentryClient(): void {
  if (typeof window === "undefined") return;
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0,
  });
}

/** Reporta um erro inesperado do cliente (fora do fluxo normal de try/catch da UI). */
export function reportClientError(err: unknown, context?: Record<string, string>): void {
  if (typeof window === "undefined" || !import.meta.env.VITE_SENTRY_DSN) return;
  Sentry.captureException(err, context ? { tags: context } : undefined);
}

export const SentryErrorBoundary = Sentry.ErrorBoundary;

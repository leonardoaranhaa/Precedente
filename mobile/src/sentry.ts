import * as Sentry from "@sentry/react-native";
import { EXPO_PUBLIC_SENTRY_DSN } from "./config";

/**
 * Sem `EXPO_PUBLIC_SENTRY_DSN`, no-op — mesmo padrão do web
 * (`src/lib/sentry.server.ts`/`sentry.client.ts`). O `Sentry.init` sozinho já
 * captura crash nativo e exceção JS não tratada, sem precisar instrumentar
 * cada `catch` manualmente.
 */
export function initSentry(): void {
  if (!EXPO_PUBLIC_SENTRY_DSN) return;
  Sentry.init({ dsn: EXPO_PUBLIC_SENTRY_DSN, tracesSampleRate: 0 });
}

export function reportError(err: unknown, context?: Record<string, string>): void {
  if (!EXPO_PUBLIC_SENTRY_DSN) return;
  Sentry.captureException(err, context ? { tags: context } : undefined);
}

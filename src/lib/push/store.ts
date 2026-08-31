import type { AlertRules, PushSubscription, WatchTarget } from "./types";
import { DEFAULT_ALERT_RULES } from "./types";

/**
 * Store em memória do processo. Em deploy/restart do Railway a lista zera;
 * o app mobile re-registra ao abrir. Suficiente para testes pessoais;
 * depois migramos para Postgres se houver conta de usuário.
 */
const byToken = new Map<string, PushSubscription>();

const MAX_WATCHES = 24;

export function upsertSubscription(input: {
  token: string;
  platform?: string;
  watches?: WatchTarget[];
  rules?: Partial<AlertRules>;
}): PushSubscription {
  const token = input.token.trim();
  if (!token || token.length < 20) {
    throw new Error("Token de push inválido.");
  }

  const prev = byToken.get(token);
  const platform =
    input.platform === "ios" || input.platform === "android" || input.platform === "web"
      ? input.platform
      : (prev?.platform ?? "unknown");

  const watches = (input.watches ?? prev?.watches ?? [])
    .filter((w) => w.ticker && w.timeframe)
    .slice(0, MAX_WATCHES);

  const rules: AlertRules = {
    ...DEFAULT_ALERT_RULES,
    ...(prev?.rules ?? {}),
    ...(input.rules ?? {}),
  };

  const sub: PushSubscription = {
    token,
    platform,
    watches,
    rules,
    updatedAt: Date.now(),
    lastSent: prev?.lastSent ?? {},
  };
  byToken.set(token, sub);
  return sub;
}

export function removeSubscription(token: string): boolean {
  return byToken.delete(token.trim());
}

export function listSubscriptions(): PushSubscription[] {
  return [...byToken.values()];
}

export function markSent(token: string, keys: string[], at = Date.now()) {
  const sub = byToken.get(token);
  if (!sub) return;
  for (const k of keys) sub.lastSent[k] = at;
  sub.updatedAt = at;
}

export function subscriptionCount(): number {
  return byToken.size;
}

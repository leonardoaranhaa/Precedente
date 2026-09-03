/**
 * Limites por plano e assertPremiumFeature — lógica pura (sem DB / sem
 * import.meta.glob) para rodar em `node --experimental-strip-types --test`.
 *
 * Gates só bloqueiam quando BILLING_GATES_ENABLED=true|1. Com a flag off
 * (default), assertPremiumFeature é no-op: a infra Stripe pode existir
 * sem trancar recurso enquanto ninguém consegue completar checkout.
 */

export type PlanId = "free" | "premium";

export type PremiumFeature = "zones" | "watch_slot" | "vision";

export type PlanLimits = {
  maxWatches: number;
  zonesEnabled: boolean;
  /** Leituras de print por dia civil (UTC). 0 = só premium (ou bloqueado). */
  visionPerDay: number;
};

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free: {
    maxWatches: 3,
    zonesEnabled: false,
    visionPerDay: 2,
  },
  premium: {
    maxWatches: 24,
    zonesEnabled: true,
    visionPerDay: 10,
  },
};

/** True só com flag explícita — fail-open por padrão (ninguém preso sem Stripe). */
export function billingGatesEnabled(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): boolean {
  const v = (env.BILLING_GATES_ENABLED ?? "").trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

export function resolvePlanLimits(isPremium: boolean): PlanLimits {
  return isPremium ? PLAN_LIMITS.premium : PLAN_LIMITS.free;
}

export class PremiumRequiredError extends Error {
  readonly status = 403;
  readonly code = "premium_required" as const;
  readonly feature: PremiumFeature;

  constructor(feature: PremiumFeature, message: string) {
    super(message);
    this.name = "PremiumRequiredError";
    this.feature = feature;
  }
}

export class PremiumQuotaError extends Error {
  readonly status = 403;
  readonly code = "premium_quota" as const;
  readonly feature: PremiumFeature;

  constructor(feature: PremiumFeature, message: string) {
    super(message);
    this.name = "PremiumQuotaError";
    this.feature = feature;
  }
}

export type AssertPremiumFeatureOpts = {
  /** Quantidade de pares na watch (após sanitize). */
  watchCount?: number;
  /** True se algum watch traz priceZone ou rsiZone com enabled. */
  hasEnabledZones?: boolean;
  /** Leituras de print já consumidas hoje (UTC) por este usuário. */
  visionCountToday?: number;
  /**
   * Override da flag de ambiente — útil em testes. Se omitido, lê
   * BILLING_GATES_ENABLED.
   */
  gatesEnabled?: boolean;
};

const COPY: Record<PremiumFeature, { required: string; quota: string }> = {
  zones: {
    required:
      "Zonas de preço e RSI por ativo fazem parte do plano Premium. Você define a faixa; o app só avisa quando o ativo entra nela — não é ordem de compra ou venda.",
    quota: "Zonas de alerta exigem o plano Premium.",
  },
  watch_slot: {
    required:
      "No plano gratuito você acompanha até 3 pares com alerta. Premium libera até 24 pares para vigilância enquanto você está longe da tela.",
    quota:
      "Limite de pares no plano atual atingido. Remova algum da watch ou assine o Premium (até 24 pares).",
  },
  vision: {
    required:
      "Leitura de print (visão) no plano gratuito exige conta e respeita uma cota diária baixa. Premium amplia a cota mensal de leituras.",
    quota:
      "Cota diária de leitura de print esgotada neste plano. Tente amanhã ou assine o Premium para uma cota maior.",
  },
};

/**
 * Valida se o plano atual permite a feature no contexto dado.
 * Não consulta banco — o caller passa `isPremium` (ex.: hasPremium(userId)).
 *
 * Com gates desligados, retorna imediatamente (soft-launch).
 */
export function assertPremiumFeature(
  isPremium: boolean,
  feature: PremiumFeature,
  opts: AssertPremiumFeatureOpts = {},
): void {
  const enabled =
    typeof opts.gatesEnabled === "boolean" ? opts.gatesEnabled : billingGatesEnabled();
  if (!enabled) return;

  const limits = resolvePlanLimits(isPremium);

  switch (feature) {
    case "zones": {
      if (opts.hasEnabledZones && !limits.zonesEnabled) {
        throw new PremiumRequiredError(feature, COPY.zones.required);
      }
      return;
    }
    case "watch_slot": {
      const count = opts.watchCount ?? 0;
      if (count > limits.maxWatches) {
        throw new PremiumQuotaError(
          feature,
          isPremium ? COPY.watch_slot.quota : COPY.watch_slot.required,
        );
      }
      return;
    }
    case "vision": {
      if (limits.visionPerDay <= 0) {
        throw new PremiumRequiredError(feature, COPY.vision.required);
      }
      const used = opts.visionCountToday ?? 0;
      if (used >= limits.visionPerDay) {
        throw new PremiumQuotaError(feature, COPY.vision.quota);
      }
      return;
    }
    default: {
      const _exhaustive: never = feature;
      void _exhaustive;
    }
  }
}

/** Conta quantos itens de watch um payload de sync provavelmente carrega. */
export function countWatchItems(data: unknown): number {
  if (!Array.isArray(data)) return 0;
  return data.length;
}

/** True se algum target tem zona de preço ou RSI habilitada. */
export function watchesHaveEnabledZones(
  watches: Array<{ priceZone?: { enabled?: boolean }; rsiZone?: { enabled?: boolean } }>,
): boolean {
  for (const w of watches) {
    if (w.priceZone?.enabled === true) return true;
    if (w.rsiZone?.enabled === true) return true;
  }
  return false;
}

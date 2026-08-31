import type { AnalysisPayload } from "@/lib/market/types";
import type { AlertEvent, AlertRules, PushSubscription } from "./types";

const COOLDOWN_MS = 6 * 60 * 60 * 1000; // 6h por par+tipo

function horizon10(payload: AnalysisPayload) {
  const hs = payload.precedent.horizons;
  return hs.find((h) => h.bars === 10) ?? hs[Math.min(1, hs.length - 1)] ?? hs[0];
}

/**
 * Gera eventos de alerta a partir de uma análise — só prevenção/contexto.
 * Nunca usa linguagem de compra/venda.
 */
export function evaluateAlerts(
  payload: AnalysisPayload,
  rules: AlertRules,
  lastSent: Record<string, number>,
  now = Date.now(),
): AlertEvent[] {
  const events: AlertEvent[] = [];
  const base = {
    ticker: payload.ticker,
    timeframe: payload.timeframe,
    displayTicker: payload.displayTicker,
  };

  const cool = (kind: string) => {
    const key = `${payload.ticker}:${payload.timeframe}:${kind}`;
    const last = lastSent[key] ?? 0;
    return now - last < COOLDOWN_MS;
  };

  if (rules.sampleWeak && payload.precedent.sampleNote !== "ok" && !cool("sample_weak")) {
    const note = payload.precedent.sampleNote;
    events.push({
      ...base,
      kind: "sample_weak",
      title: `${payload.displayTicker} · amostra ${note}`,
      body:
        note === "tiny"
          ? `Só ${payload.precedent.matches} precedentes neste TF. Trate a distribuição do caminho como ilustração.`
          : `Amostra pequena (n=${payload.precedent.matches}). Interprete horizontes e drawdown com cautela.`,
    });
  }

  const h = horizon10(payload);
  if (
    rules.drawdownPath &&
    h &&
    Math.abs(h.medianDrawdownPct) >= rules.drawdownThresholdPct &&
    !cool("drawdown_path")
  ) {
    const dd = h.medianDrawdownPct.toFixed(1).replace(".", ",");
    events.push({
      ...base,
      kind: "drawdown_path",
      title: `${payload.displayTicker} · caminho com DD elevado`,
      body: `Drawdown mediano em ${h.bars} barras: ${dd}%. O risco está no trajeto, não só no ponto final.`,
    });
  }

  if (
    rules.extreme20 &&
    (payload.snapshot.near20High || payload.snapshot.near20Low) &&
    !cool("extreme_20")
  ) {
    const side = payload.snapshot.near20High ? "máxima" : "mínima";
    events.push({
      ...base,
      kind: "extreme_20",
      title: `${payload.displayTicker} · extremo 20 barras`,
      body: `Preço colado na ${side} de 20 barras. Contexto de fragilidade no fingerprint — sem ordem de exposição.`,
    });
  }

  return events;
}

export function alertCooldownKey(ev: AlertEvent): string {
  return `${ev.ticker}:${ev.timeframe}:${ev.kind}`;
}

export function shouldScan(sub: PushSubscription): boolean {
  return sub.watches.length > 0 && Boolean(sub.token);
}

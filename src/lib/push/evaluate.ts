import type { AnalysisPayload } from "@/lib/market/types";
import type { AlertEvent, AlertRules, PushSubscription, WatchTarget } from "./types";

const COOLDOWN_MS = 6 * 60 * 60 * 1000; // 6h por par+tipo

function horizon10(payload: AnalysisPayload) {
  const hs = payload.precedent.horizons;
  return hs.find((h) => h.bars === 10) ?? hs[Math.min(1, hs.length - 1)] ?? hs[0];
}

function formatPrice(n: number): string {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: n < 1 ? 6 : 2 });
}

/**
 * Gera eventos de alerta a partir de uma análise — só prevenção/contexto.
 * Nunca usa linguagem de compra/venda. `watch` carrega a configuração de zona
 * específica deste par (preço/RSI) — diferente das outras regras, que são
 * globais pra toda a watchlist da subscription.
 */
export function evaluateAlerts(
  payload: AnalysisPayload,
  watch: Pick<WatchTarget, "priceZone" | "rsiZone">,
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

  const zone = watch.priceZone;
  if (zone?.enabled && (zone.min != null || zone.max != null) && !cool("price_zone")) {
    const price = payload.snapshot.last.c;
    const inZone = (zone.min == null || price >= zone.min) && (zone.max == null || price <= zone.max);
    if (inZone) {
      const range =
        zone.min != null && zone.max != null
          ? `${formatPrice(zone.min)}–${formatPrice(zone.max)}`
          : zone.min != null
            ? `acima de ${formatPrice(zone.min)}`
            : `abaixo de ${formatPrice(zone.max!)}`;
      events.push({
        ...base,
        kind: "price_zone",
        title: `${payload.displayTicker} · na zona de preço`,
        body: `Preço em ${formatPrice(price)}, dentro da faixa configurada (${range}).`,
      });
    }
  }

  const rsiZone = watch.rsiZone;
  if (rsiZone?.enabled && (rsiZone.below != null || rsiZone.above != null) && !cool("rsi_zone")) {
    const rsi = payload.snapshot.rsi14;
    const below = rsiZone.below != null && rsi <= rsiZone.below;
    const above = rsiZone.above != null && rsi >= rsiZone.above;
    if (below || above) {
      events.push({
        ...base,
        kind: "rsi_zone",
        title: `${payload.displayTicker} · RSI em zona`,
        body: `RSI em ${rsi.toFixed(0)}, ${below ? "abaixo" : "acima"} do limite configurado (${
          below ? rsiZone.below : rsiZone.above
        }).`,
      });
    }
  }

  return events;
}

export function alertCooldownKey(ev: AlertEvent): string {
  return `${ev.ticker}:${ev.timeframe}:${ev.kind}`;
}

export function shouldScan(sub: PushSubscription): boolean {
  return sub.watches.length > 0 && Boolean(sub.token);
}

import type { AnalysisPayload } from "@/lib/market/types";
import type {
  AlertEvent,
  AlertRules,
  PushSubscription,
  WatchTarget,
} from "./types";
import {
  detectRegimeTransition,
  regimeBody,
  regimeStateKey,
  regimeTitle,
  sampleNoteCode,
  type SampleNote,
} from "./sample-regime.ts";

const COOLDOWN_MS = 6 * 60 * 60 * 1000; // 6h por par+tipo

function horizon10(payload: AnalysisPayload) {
  const hs = payload.precedent.horizons;
  return hs.find((h) => h.bars === 10) ?? hs[Math.min(1, hs.length - 1)] ?? hs[0];
}

function formatPrice(n: number): string {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: n < 1 ? 6 : 2 });
}

function formatUsdCompact(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

function formatFundingPct(n: number): string {
  const pct = n * 100;
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(4).replace(".", ",")}%`;
}

function zoneContext(payload: AnalysisPayload): string {
  const parts: string[] = [];
  const oc = payload.onchain;
  if (oc?.fundingRate != null) parts.push(`funding ${formatFundingPct(oc.fundingRate)}`);
  if (oc?.liquidityUsd != null) parts.push(`liquidez ${formatUsdCompact(oc.liquidityUsd)}`);
  const fpFirst = payload.precedent.fingerprintLabel.split(" · ")[0];
  if (fpFirst) parts.push(fpFirst);
  return parts.join(" · ");
}

export function evaluateAlerts(
  payload: AnalysisPayload,
  watch: Pick<WatchTarget, "priceZone" | "rsiZone">,
  rules: AlertRules,
  lastSent: Record<string, number>,
  now = Date.now(),
): AlertEvent[] {
  const events: AlertEvent[] = [];
  const ctx = zoneContext(payload);
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

  if (rules.sampleRegime) {
    const note = payload.precedent.sampleNote as SampleNote;
    const key = regimeStateKey(payload.ticker, payload.timeframe);
    const prevCode = lastSent[key] ?? 0;
    const transition = detectRegimeTransition(prevCode > 0 ? prevCode : undefined, note);
    if (transition && !cool("sample_regime")) {
      events.push({
        ...base,
        kind: "sample_regime",
        title: regimeTitle(payload.displayTicker, transition),
        body: regimeBody(transition, payload.precedent.matches),
      });
    }
  }

  if (rules.drawdownPath && !cool("drawdown_path")) {
    const h = horizon10(payload);
    if (h && Math.abs(h.medianDrawdownPct) >= rules.drawdownThresholdPct) {
      events.push({
        ...base,
        kind: "drawdown_path",
        title: `${payload.displayTicker} · DD do caminho`,
        body: `Drawdown mediano do caminho ~${h.medianDrawdownPct.toFixed(1).replace(".", ",")}% (limiar ${rules.drawdownThresholdPct}%). Só estatística de precedentes.`,
      });
    }
  }

  if (rules.extreme20 && !cool("extreme_20")) {
    if (payload.snapshot.near20High || payload.snapshot.near20Low) {
      const side = payload.snapshot.near20High ? "high20" : "low20";
      events.push({
        ...base,
        kind: "extreme_20",
        title: `${payload.displayTicker} · perto de ${side}`,
        body: `Preço perto da extrema de 20 barras (${side}). Contexto de posição, não ordem.`,
      });
    }
  }

  if (
    rules.fundingExtreme &&
    payload.onchain?.fundingRate != null &&
    !cool("funding_extreme")
  ) {
    const fr = payload.onchain.fundingRate;
    const thr = rules.fundingThreshold > 0 ? rules.fundingThreshold : 0.0005;
    if (Math.abs(fr) >= thr) {
      events.push({
        ...base,
        kind: "funding_extreme",
        title: `${payload.displayTicker} · funding elevado`,
        body: `Funding ${formatFundingPct(fr)} (|limiar| ${formatFundingPct(thr)}). Posicionamento de perp — não sinal de direção.`,
      });
    }
  }

  const priceZone = watch.priceZone;
  if (
    priceZone?.enabled &&
    (priceZone.min != null || priceZone.max != null) &&
    !cool("price_zone")
  ) {
    const price = payload.snapshot.last.c;
    const inMin = priceZone.min == null || price >= priceZone.min;
    const inMax = priceZone.max == null || price <= priceZone.max;
    if (inMin && inMax) {
      const range =
        priceZone.min != null && priceZone.max != null
          ? `${formatPrice(priceZone.min)}–${formatPrice(priceZone.max)}`
          : priceZone.min != null
            ? `≥ ${formatPrice(priceZone.min)}`
            : `≤ ${formatPrice(priceZone.max!)}`;
      events.push({
        ...base,
        kind: "price_zone",
        title: `${payload.displayTicker} · na zona de preço`,
        body: `Preço em ${formatPrice(price)}, dentro da faixa configurada (${range}).${ctx ? ` ${ctx}.` : ""}`,
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
        }).${ctx ? ` ${ctx}.` : ""}`,
      });
    }
  }

  if (
    rules.volumeAnomaly &&
    payload.snapshot.volRatio != null &&
    !cool("volume_anomaly")
  ) {
    const multiple =
      typeof rules.volumeMultiple === "number" && rules.volumeMultiple > 1
        ? rules.volumeMultiple
        : 3;
    if (payload.snapshot.volRatio >= multiple) {
      const ratio = payload.snapshot.volRatio.toFixed(1).replace(".", ",");
      events.push({
        ...base,
        kind: "volume_anomaly",
        title: `${payload.displayTicker} · volume anômalo`,
        body: `Volume da barra atual ~${ratio}× a mediana das 20 anteriores. Atividade elevada no TF — contexto, não direção de trade.${ctx ? ` ${ctx}.` : ""}`,
      });
    }
  }

  return events;
}

export function alertCooldownKey(ev: AlertEvent): string {
  return `${ev.ticker}:${ev.timeframe}:${ev.kind}`;
}

export function regimeStatePatch(
  ticker: string,
  timeframe: string,
  sampleNote: SampleNote,
): { key: string; code: number } {
  return { key: regimeStateKey(ticker, timeframe), code: sampleNoteCode(sampleNote) };
}

export function shouldScan(sub: PushSubscription): boolean {
  return sub.watches.length > 0 && Boolean(sub.token);
}

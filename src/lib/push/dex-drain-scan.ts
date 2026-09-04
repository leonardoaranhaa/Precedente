/**
 * Scan dos tickers DEX pinados — compara o nível de drenagem contra o
 * estado salvo em lastSent e envia só nas transições de piora.
 *
 * Import de @/lib/market/dex é DINÂMICO, igual aos outros dois pontos do
 * projeto (analyze.ts, funding-digest-scan.ts). Ver docs/dex-arquitetura.md
 * — misturar estático e dinâmico no mesmo módulo corrompe o chunk do Rolldown.
 */
import { mapWithConcurrency } from "@/lib/concurrency";
import { COOLDOWN_MS } from "./evaluate";
import {
  dexDrainStateKey,
  detectDrainTransition,
  drainBody,
  drainLevel,
  drainLevelCode,
  drainTitle,
} from "./dex-drain";
import { sendExpoAlerts } from "./expo-send";
import { listSubscriptions, markSent, markStateCodes, removeSubscription } from "./store";
import type { AlertEvent, PushSubscription } from "./types";
import type { DexPairReading } from "@/lib/market/dex";

export type DexDrainScanReport = {
  subscriptions: number;
  tickers: number;
  alerts: number;
  sentOk: number;
  sentFailed: number;
  pruned: number;
  errors: string[];
};

const CONCURRENCY = 4;

function shouldScanDex(sub: PushSubscription): boolean {
  return sub.dexWatches.length > 0 && Boolean(sub.token);
}

type TickerResult =
  | { ok: true; reading: DexPairReading | null }
  | { ok: false; error: string };

export async function scanDexDrain(): Promise<DexDrainScanReport> {
  const report: DexDrainScanReport = {
    subscriptions: 0,
    tickers: 0,
    alerts: 0,
    sentOk: 0,
    sentFailed: 0,
    pruned: 0,
    errors: [],
  };

  const subs = (await listSubscriptions()).filter(shouldScanDex);
  report.subscriptions = subs.length;
  if (subs.length === 0) return report;

  const tickers = [...new Set(subs.flatMap((s) => s.dexWatches))];
  report.tickers = tickers.length;
  if (tickers.length === 0) return report;

  const { readDexPair } = await import("@/lib/market/dex");

  const results = await mapWithConcurrency(tickers, CONCURRENCY, async (ticker) => {
    try {
      const reading = await readDexPair(ticker);
      return [ticker, { ok: true, reading } satisfies TickerResult] as const;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "erro";
      return [ticker, { ok: false, error: msg } satisfies TickerResult] as const;
    }
  });

  const byTicker = new Map<string, TickerResult>(results);
  for (const [ticker, result] of byTicker) {
    if (!result.ok) report.errors.push(`${ticker} — ${result.error}`);
  }

  for (const sub of subs) {
    const eventsForToken: AlertEvent[] = [];
    const patches: { key: string; code: number }[] = [];

    const now = Date.now();
    for (const ticker of sub.dexWatches) {
      const result = byTicker.get(ticker);
      if (!result?.ok || !result.reading) continue;

      const { pair, fragility } = result.reading;
      const stateKey = dexDrainStateKey(ticker);
      const cooldownKey = `${ticker}:_dex_drain:dex_drain`;
      const transition = detectDrainTransition(sub.lastSent[stateKey], fragility);

      // Sempre atualiza o código de estado — mesmo sem transição, pra que a
      // PRÓXIMA comparação tenha o nível real como ponto de partida. Sem
      // isso, um par que flutua none↔watch rápido nunca fixaria uma base e
      // reavaliaria "piora" do zero a cada scan.
      patches.push({ key: stateKey, code: drainLevelCode(drainLevel(fragility)) });

      // Cooldown por cima da transição: o código de estado sozinho não é
      // monotônico (recuperação registra um código mais baixo), então um par
      // oscilando none→watch→none→watch em scans de minutos re-dispararia
      // "fluxo piorando" a cada volta sem o piso de tempo — a mesma fadiga de
      // alerta que COOLDOWN_MS já existe pra evitar no resto do sistema.
      const lastFired = sub.lastSent[cooldownKey] ?? 0;
      if (transition && now - lastFired >= COOLDOWN_MS) {
        eventsForToken.push({
          kind: "dex_drain",
          ticker,
          timeframe: null,
          displayTicker: pair.tokenSymbol ?? ticker,
          title: drainTitle(pair.tokenSymbol ?? ticker, transition),
          body: drainBody(transition),
        });
      }
    }

    if (patches.length > 0) {
      await markStateCodes(sub.token, patches);
    }

    if (eventsForToken.length === 0) continue;
    report.alerts += eventsForToken.length;

    try {
      const result = await sendExpoAlerts(sub.token, eventsForToken);
      report.sentOk += result.ok;
      report.sentFailed += result.failed;
      if (result.invalidToken) {
        await removeSubscription(sub.token);
        report.pruned += 1;
        continue;
      }
      if (result.ok > 0) {
        await markSent(
          sub.token,
          eventsForToken.map((ev) => `${ev.ticker}:_dex_drain:${ev.kind}` as const),
        );
      }
    } catch (err) {
      report.errors.push(
        `token…${sub.token.slice(-8)} — ${err instanceof Error ? err.message : "falha push"}`,
      );
      report.sentFailed += eventsForToken.length;
    }
  }

  return report;
}

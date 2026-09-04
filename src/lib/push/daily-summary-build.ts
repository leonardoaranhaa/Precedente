/**
 * Resumo diário combinado — watch + notícias num único push, em vez de dois
 * disparos separados no mesmo dia.
 *
 * DECISÃO DE ESCOPO (docs/push-alerts.md): o resumo combinado é um OPT-IN
 * à parte (`dailySummaryEnabled`), mutuamente exclusivo do digest de watch
 * isolado — `scanWatchDigests` pula quem tem o combinado ligado, pra nunca
 * mandar os dois no mesmo dia. O digest de notícias isolado (`news/
 * digest-scan.ts`) NÃO foi tocado: se alguém ligar os dois de propósito,
 * recebe dois pushes — aceitável, e evita acoplar o store de notícias
 * (userId) ao de push (token) além do necessário.
 *
 * Puro: recebe os dados já buscados por quem chama (mesmo padrão de
 * watch-digest-build.ts e dex/fragility.ts), devolve texto. Sem fetch.
 */
import type { MoversSnapshot } from "../market/movers-24h.ts";
import { formatMoversForPush } from "../market/movers-24h.ts";
import type { NewsItem } from "../news/types.ts";
import type { WatchDigestLine } from "./watch-digest-build.ts";

const MAX_WATCH_LINES = 6;
const MAX_NEWS_ITEMS = 4;
const MAX_BODY_CHARS = 380;

export function buildDailySummaryTitle(
  watchLines: WatchDigestLine[],
  news: NewsItem[],
): string {
  const flagged = watchLines.filter((l) => !l.flags.includes("sem flag de prevenção")).length;
  const parts: string[] = ["Resumo diário"];
  if (watchLines.length > 0) parts.push(flagged > 0 ? `${flagged} c/ flag` : `${watchLines.length} par(es)`);
  if (news.length > 0) parts.push(`${news.length} notícia${news.length === 1 ? "" : "s"}`);
  return parts.join(" · ");
}

export function buildDailySummaryBody(
  watchLines: WatchDigestLine[],
  news: NewsItem[],
  movers: MoversSnapshot | null,
): string {
  const parts: string[] = [];

  if (watchLines.length > 0) {
    parts.push("Watch:");
    for (const line of watchLines.slice(0, MAX_WATCH_LINES)) {
      parts.push(`· ${line.displayTicker} ${line.timeframe}: ${line.flags.join(", ")}`);
    }
  }

  if (news.length > 0) {
    if (parts.length > 0) parts.push("");
    parts.push("Notícias:");
    for (const item of news.slice(0, MAX_NEWS_ITEMS)) {
      parts.push(`· ${item.title}`);
    }
  }

  if (watchLines.length === 0 && news.length === 0) {
    parts.push("Sem watch ou notícias novas nas suas preferências hoje.");
  }

  if (movers) {
    parts.push("");
    parts.push(formatMoversForPush(movers, 3));
  }

  parts.push("");
  parts.push("Só contexto factual — não é recomendação nem sinal.");

  let body = parts.join("\n");
  if (body.length > MAX_BODY_CHARS) body = body.slice(0, MAX_BODY_CHARS - 1).trimEnd() + "…";
  return body;
}

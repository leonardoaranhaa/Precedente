import assert from "node:assert/strict";
import { test } from "node:test";
import { buildDailySummaryBody, buildDailySummaryTitle } from "./daily-summary-build.ts";
import type { WatchDigestLine } from "./watch-digest-build.ts";
import type { NewsItem } from "../news/types.ts";
import { MOVERS_DISCLAIMER, type MoversSnapshot } from "../market/movers-24h.ts";

function line(overrides: Partial<WatchDigestLine> = {}): WatchDigestLine {
  return {
    ticker: "BTCUSDT",
    displayTicker: "BTC/USDT",
    timeframe: "1h",
    sampleNote: "ok",
    matches: 40,
    medianDrawdownPct: -2,
    last: 100_000,
    rsi14: 55,
    flags: ["sem flag de prevenção"],
    ...overrides,
  };
}

function news(title: string): NewsItem {
  return {
    id: title,
    title,
    link: `https://example.com/${encodeURIComponent(title)}`,
    source: "Exemplo",
    publishedAt: Date.now(),
    coins: [],
    categories: [],
  };
}

test("título combina contagem de watch com flag e contagem de notícias", () => {
  const t = buildDailySummaryTitle(
    [line({ flags: ["amostra small"] }), line()],
    [news("A"), news("B")],
  );
  assert.equal(t, "Resumo diário · 1 c/ flag · 2 notícias");
});

test("título sem watch e sem notícia ainda diz 'Resumo diário'", () => {
  assert.equal(buildDailySummaryTitle([], []), "Resumo diário");
});

test("singular de notícia não pluraliza", () => {
  const t = buildDailySummaryTitle([], [news("Única")]);
  assert.match(t, /1 notícia(?!s)/);
});

test("corpo lista watch e notícias em seções separadas", () => {
  const body = buildDailySummaryBody(
    [line({ displayTicker: "ETH/USDT", flags: ["DD med -5,0%"] })],
    [news("Manchete um")],
    null,
  );
  assert.match(body, /Watch:\n· ETH\/USDT 1h: DD med -5,0%/);
  assert.match(body, /Notícias:\n· Manchete um/);
});

test("sem watch e sem notícia, diz que não há nada novo em vez de seções vazias", () => {
  const body = buildDailySummaryBody([], [], null);
  assert.match(body, /Sem watch ou notícias novas/);
  assert.equal(body.includes("Watch:"), false);
  assert.equal(body.includes("Notícias:"), false);
});

test("corta em MAX_WATCH_LINES e MAX_NEWS_ITEMS", () => {
  const lines = Array.from({ length: 10 }, (_, i) => line({ displayTicker: `T${i}` }));
  const items = Array.from({ length: 10 }, (_, i) => news(`N${i}`));
  const body = buildDailySummaryBody(lines, items, null);
  const watchCount = (body.match(/^· T/gm) ?? []).length;
  const newsCount = (body.match(/^· N/gm) ?? []).length;
  assert.equal(watchCount, 6);
  assert.equal(newsCount, 4);
});

test("movers aparecem quando fornecidos", () => {
  const movers: MoversSnapshot = {
    fetchedAt: Date.now(),
    source: "Binance",
    disclaimer: MOVERS_DISCLAIMER,
    byAbsChange: [],
    byQuoteVolume: [],
    gainers: [
      {
        symbol: "SOLUSDT",
        base: "SOL",
        lastPrice: 200,
        changePct: 8.2,
        volumeBase: 1,
        quoteVolume: 5e8,
        high: 210,
        low: 180,
        open: 185,
        session: "acima",
        rangePct: 16,
      },
    ],
    losers: [],
  };
  const body = buildDailySummaryBody([line()], [], movers);
  assert.match(body, /SOL/);
});

test("corpo nunca passa de 380 caracteres, mesmo com muito conteúdo", () => {
  const lines = Array.from({ length: 20 }, (_, i) =>
    line({ displayTicker: `TOKEN${i}`, flags: ["amostra tiny", "DD med -12,3%", "perto high20"] }),
  );
  const items = Array.from({ length: 20 }, (_, i) => news(`Manchete bem longa número ${i} sobre o mercado`));
  const body = buildDailySummaryBody(lines, items, null);
  assert.ok(body.length <= 380);
});

test("nenhuma linha usa linguagem de ordem de compra/venda", () => {
  const body = buildDailySummaryBody([line({ flags: ["DD med -8,0%"] })], [news("Bitcoin sobe")], null);
  for (const proibido of ["compre", "venda agora", "entrada", "alvo", "stop"]) {
    assert.equal(body.toLowerCase().includes(proibido), false, `não deveria conter "${proibido}"`);
  }
  assert.match(body, /não é recomendação nem sinal/);
});

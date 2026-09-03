import { test } from "node:test";
import assert from "node:assert/strict";
import {
  formatDigestPushBody,
  localDateKey,
  localHour,
  shouldRunDigest,
} from "./digest-schedule.ts";
import { baseAssetFromTicker, buildNewsContext } from "./context-for-ticker.ts";
import type { NewsItem } from "./types.ts";

test("localHour / localDateKey UTC", () => {
  const d = new Date("2026-09-03T11:30:00Z");
  assert.equal(localHour(d, "UTC"), 11);
  assert.equal(localDateKey(d, "UTC"), "2026-09-03");
});

test("shouldRunDigest respeita enabled, hora e alreadyRan", () => {
  const now = new Date("2026-09-03T11:05:00Z"); // 08:05 em Sao_Paulo (UTC-3)
  assert.equal(
    shouldRunDigest({
      digestEnabled: true,
      digestHour: 8,
      timezone: "America/Sao_Paulo",
      alreadyRanToday: false,
      now,
    }),
    true,
  );
  assert.equal(
    shouldRunDigest({
      digestEnabled: true,
      digestHour: 8,
      timezone: "America/Sao_Paulo",
      alreadyRanToday: true,
      now,
    }),
    false,
  );
  assert.equal(
    shouldRunDigest({
      digestEnabled: false,
      digestHour: 8,
      timezone: "America/Sao_Paulo",
      alreadyRanToday: false,
      now,
    }),
    false,
  );
  assert.equal(
    shouldRunDigest({
      digestEnabled: true,
      digestHour: 8,
      timezone: "America/Sao_Paulo",
      alreadyRanToday: true,
      force: true,
      now,
    }),
    true,
  );
});

test("formatDigestPushBody nunca sugere compra/venda", () => {
  const { title, body } = formatDigestPushBody([
    { title: "BTC sobe 10% após notícia", categories: ["market"] },
  ]);
  assert.match(title, /Precedente/);
  assert.match(body, /contexto|não é ordem/i);
  assert.doesNotMatch(body, /\b(compre|venda agora|sinal de compra)\b/i);
});

test("buildNewsContext filtra por base e janela", () => {
  const now = Date.parse("2026-09-03T12:00:00Z");
  const items: NewsItem[] = [
    {
      id: "1",
      title: "Bitcoin ETF flow",
      link: "https://x/1",
      source: "CoinDesk",
      publishedAt: now - 2 * 60 * 60 * 1000,
      coins: ["BTC"],
      categories: ["institutional"],
    },
    {
      id: "2",
      title: "ETH hack",
      link: "https://x/2",
      source: "Decrypt",
      publishedAt: now - 1 * 60 * 60 * 1000,
      coins: ["ETH"],
      categories: ["security"],
    },
    {
      id: "3",
      title: "BTC old",
      link: "https://x/3",
      source: "Cointelegraph",
      publishedAt: now - 100 * 60 * 60 * 1000,
      coins: ["BTC"],
      categories: ["market"],
    },
  ];
  assert.equal(baseAssetFromTicker("BTCUSDT"), "BTC");
  const ctx = buildNewsContext(items, "BTCUSDT", { now, windowHours: 48 });
  assert.equal(ctx.items.length, 1);
  assert.equal(ctx.items[0]!.id, "1");
  assert.equal(ctx.flags.institutional, true);
  assert.equal(ctx.flags.security, false);
});

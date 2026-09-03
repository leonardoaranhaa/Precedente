import assert from "node:assert/strict";
import { test } from "node:test";
import { sanitizePreferences } from "./sanitize.ts";
import { DEFAULT_NEWS_PREFERENCES } from "./types.ts";

test("sanitizePreferences aceita coins/categories válidos", () => {
  const prefs = sanitizePreferences({ coins: ["btc", "eth"], categories: ["regulatory", "market"] });
  assert.deepEqual(prefs.coins, ["BTC", "ETH"]);
  assert.deepEqual(prefs.categories, ["regulatory", "market"]);
  assert.equal(prefs.digestEnabled, true);
  assert.equal(prefs.digestHour, 8);
});

test("sanitizePreferences descarta categoria desconhecida", () => {
  const prefs = sanitizePreferences({ coins: [], categories: ["regulatory", "not-a-category"] });
  assert.deepEqual(prefs.categories, ["regulatory"]);
});

test("sanitizePreferences descarta entradas não-string ou vazias", () => {
  const prefs = sanitizePreferences({ coins: ["BTC", 123, "", null], categories: [] });
  assert.deepEqual(prefs.coins, ["BTC"]);
});

test("sanitizePreferences com entrada inválida retorna padrão", () => {
  assert.deepEqual(sanitizePreferences(null), { ...DEFAULT_NEWS_PREFERENCES });
  assert.deepEqual(sanitizePreferences("nope"), { ...DEFAULT_NEWS_PREFERENCES });
});

test("sanitizePreferences respeita o teto de itens", () => {
  const manyCoins = Array.from({ length: 60 }, (_, i) => `C${i}`);
  const prefs = sanitizePreferences({ coins: manyCoins, categories: [] });
  assert.equal(prefs.coins.length, 50);
});

test("sanitizePreferences digest hour e token Expo", () => {
  const prefs = sanitizePreferences({
    digestHour: 22,
    timezone: "America/Sao_Paulo",
    pushToken: "ExponentPushToken[abc123]",
    digestEnabled: false,
    pushEnabled: false,
  });
  assert.equal(prefs.digestHour, 22);
  assert.equal(prefs.digestEnabled, false);
  assert.equal(prefs.pushEnabled, false);
  assert.equal(prefs.pushToken, "ExponentPushToken[abc123]");
  assert.equal(sanitizePreferences({ pushToken: "invalid" }).pushToken, null);
});

import assert from "node:assert/strict";
import { test } from "node:test";
import { sanitizePreferences } from "./sanitize.ts";

test("sanitizePreferences aceita coins/categories válidos", () => {
  const prefs = sanitizePreferences({ coins: ["btc", "eth"], categories: ["regulatory", "market"] });
  assert.deepEqual(prefs.coins, ["BTC", "ETH"]);
  assert.deepEqual(prefs.categories, ["regulatory", "market"]);
});

test("sanitizePreferences descarta categoria desconhecida", () => {
  const prefs = sanitizePreferences({ coins: [], categories: ["regulatory", "not-a-category"] });
  assert.deepEqual(prefs.categories, ["regulatory"]);
});

test("sanitizePreferences descarta entradas não-string ou vazias", () => {
  const prefs = sanitizePreferences({ coins: ["BTC", 123, "", null], categories: [] });
  assert.deepEqual(prefs.coins, ["BTC"]);
});

test("sanitizePreferences com entrada inválida retorna padrão vazio", () => {
  assert.deepEqual(sanitizePreferences(null), { coins: [], categories: [] });
  assert.deepEqual(sanitizePreferences("nope"), { coins: [], categories: [] });
  assert.deepEqual(sanitizePreferences(undefined), { coins: [], categories: [] });
});

test("sanitizePreferences respeita o teto de itens", () => {
  const manyCoins = Array.from({ length: 60 }, (_, i) => `C${i}`);
  const prefs = sanitizePreferences({ coins: manyCoins, categories: [] });
  assert.equal(prefs.coins.length, 50);
});

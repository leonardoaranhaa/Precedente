import assert from "node:assert/strict";
import { test } from "node:test";
import { sanitizePreferences } from "./sanitize.ts";

test("sanitizePreferences aceita coins/categories válidos", () => {
  const prefs = sanitizePreferences({ coins: ["btc", "eth"], categories: ["regulatory", "market"] });
  assert.deepEqual(prefs.coins, ["BTC", "ETH"]);
  assert.deepEqual(prefs.categories, ["regulatory", "market"]);
  assert.equal(prefs.digestEnabled, false);
  assert.equal(prefs.digestHourUtc, 12);
  assert.deepEqual(prefs.digestTokens, []);
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
  assert.deepEqual(sanitizePreferences(null), {
    coins: [],
    categories: [],
    digestEnabled: false,
    digestHourUtc: 12,
    digestTokens: [],
  });
  assert.deepEqual(sanitizePreferences("nope"), {
    coins: [],
    categories: [],
    digestEnabled: false,
    digestHourUtc: 12,
    digestTokens: [],
  });
  assert.deepEqual(sanitizePreferences(undefined), {
    coins: [],
    categories: [],
    digestEnabled: false,
    digestHourUtc: 12,
    digestTokens: [],
  });
});

test("sanitizePreferences respeita o teto de itens", () => {
  const manyCoins = Array.from({ length: 60 }, (_, i) => `C${i}`);
  const prefs = sanitizePreferences({ coins: manyCoins, categories: [] });
  assert.equal(prefs.coins.length, 50);
});

test("sanitizePreferences digest: hora e tokens", () => {
  const prefs = sanitizePreferences({
    coins: [],
    categories: [],
    digestEnabled: true,
    digestHourUtc: 8,
    digestTokens: ["ExponentPushToken[abc123]", "invalid", "ExpoPushToken[xyz]"],
  });
  assert.equal(prefs.digestEnabled, true);
  assert.equal(prefs.digestHourUtc, 8);
  assert.deepEqual(prefs.digestTokens, ["ExponentPushToken[abc123]", "ExpoPushToken[xyz]"]);
});

test("sanitizePreferences digest: hora fora de faixa volta ao default", () => {
  assert.equal(sanitizePreferences({ digestHourUtc: 24 }).digestHourUtc, 12);
  assert.equal(sanitizePreferences({ digestHourUtc: -1 }).digestHourUtc, 12);
});

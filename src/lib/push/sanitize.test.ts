import assert from "node:assert/strict";
import { test } from "node:test";
import { sanitizePriceZone, sanitizeRsiZone, sanitizeWatchTarget } from "./sanitize.ts";

test("sanitizePriceZone corrige min > max invertido", () => {
  const zone = sanitizePriceZone({ enabled: true, min: 100, max: 50 });
  assert.equal(zone?.min, 50);
  assert.equal(zone?.max, 100);
});

test("sanitizePriceZone descarta valores não-finitos e negativos", () => {
  const zone = sanitizePriceZone({ enabled: true, min: -10, max: Number.NaN });
  assert.equal(zone?.min, null);
  assert.equal(zone?.max, null);
  assert.equal(zone?.enabled, false);
});

test("sanitizePriceZone aceita faixa aberta (só min ou só max)", () => {
  const zone = sanitizePriceZone({ enabled: true, min: 42, max: null });
  assert.equal(zone?.min, 42);
  assert.equal(zone?.max, null);
  assert.equal(zone?.enabled, true);
});

test("sanitizePriceZone retorna undefined para entrada não-objeto", () => {
  assert.equal(sanitizePriceZone(null), undefined);
  assert.equal(sanitizePriceZone("nope"), undefined);
});

test("sanitizeRsiZone descarta valores fora de 0–100 em vez de clampar", () => {
  const zone = sanitizeRsiZone({ enabled: true, below: 999, above: -5 });
  assert.equal(zone?.below, null);
  assert.equal(zone?.above, null);
  assert.equal(zone?.enabled, false);
});

test("sanitizeRsiZone aceita valores válidos", () => {
  const zone = sanitizeRsiZone({ enabled: true, below: 30, above: 70 });
  assert.equal(zone?.below, 30);
  assert.equal(zone?.above, 70);
  assert.equal(zone?.enabled, true);
});

test("sanitizeWatchTarget preserva ticker/timeframe e omite zonas vazias", () => {
  const w = sanitizeWatchTarget({ ticker: "BTCUSDT", timeframe: "1h" });
  assert.equal(w.ticker, "BTCUSDT");
  assert.equal(w.timeframe, "1h");
  assert.equal("priceZone" in w, false);
  assert.equal("rsiZone" in w, false);
});

test("sanitizeWatchTarget inclui zona de preço saneada quando presente", () => {
  const w = sanitizeWatchTarget({
    ticker: "ETHUSDT",
    timeframe: "4h",
    priceZone: { enabled: true, min: 3000, max: 1000 },
  });
  assert.deepEqual(w.priceZone, { enabled: true, min: 1000, max: 3000 });
});

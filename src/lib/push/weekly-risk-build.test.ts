import assert from "node:assert/strict";
import { test } from "node:test";
import {
  countRiskFromLastSent,
  formatWeeklyRiskBody,
  formatWeeklyRiskTitle,
} from "./weekly-risk-build.ts";

test("countRiskFromLastSent agrega kinds na janela", () => {
  const now = Date.now();
  const counts = countRiskFromLastSent(
    {
      "BTCUSDT:1h:sample_weak": now - 1000,
      "ETHUSDT:1h:drawdown_path": now - 2000,
      "BTCUSDT:1h:_sample_regime": now - 500,
      "X:1h:sample_weak": now - 8 * 24 * 3600 * 1000,
    },
    now - 7 * 24 * 3600 * 1000,
    now,
  );
  assert.equal(counts.sample_weak, 1);
  assert.equal(counts.drawdown_path, 1);
});

test("body sem linguagem de trade", () => {
  const body = formatWeeklyRiskBody(
    {
      sample_weak: 2,
      sample_regime: 0,
      drawdown_path: 1,
      extreme_20: 0,
      price_zone: 0,
      rsi_zone: 0,
      funding_extreme: 0,
      volume_anomaly: 0,
      dex_drain: 0,
    },
    3,
  );
  assert.match(body, /amostra fraca: 2/);
  assert.doesNotMatch(body, /\b(compre|venda|lucro)\b/i);
  assert.match(formatWeeklyRiskTitle(3), /3 aviso/);
});

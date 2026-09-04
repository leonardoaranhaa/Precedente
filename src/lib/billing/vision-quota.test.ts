import assert from "node:assert/strict";
import { test } from "node:test";
import {
  _resetVisionQuotaForTests,
  getVisionQuotaSnapshot,
  incrementVisionCount,
} from "./vision-quota.ts";

test("snapshot nearLimit quando resta 1", () => {
  _resetVisionQuotaForTests();
  incrementVisionCount("u-near");
  const snap = getVisionQuotaSnapshot("u-near", false);
  assert.equal(snap.used, 1);
  assert.equal(snap.limit, 2);
  assert.equal(snap.remaining, 1);
  assert.equal(snap.nearLimit, true);
  assert.equal(snap.exhausted, false);
  assert.ok(snap.message && /1 leitura/i.test(snap.message));
});

test("snapshot exhausted no limite free", () => {
  _resetVisionQuotaForTests();
  incrementVisionCount("u-ex");
  incrementVisionCount("u-ex");
  const snap = getVisionQuotaSnapshot("u-ex", false);
  assert.equal(snap.exhausted, true);
  assert.equal(snap.remaining, 0);
  assert.ok(snap.message && /esgotada/i.test(snap.message));
});

test("premium limit 10", () => {
  _resetVisionQuotaForTests();
  const snap = getVisionQuotaSnapshot("u-p", true);
  assert.equal(snap.limit, 10);
  assert.equal(snap.nearLimit, false);
});

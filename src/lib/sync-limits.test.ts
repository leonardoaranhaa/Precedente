import assert from "node:assert/strict";
import { test } from "node:test";
import { assertSyncPayload, InvalidSyncPayloadError, SYNC_MAX_BYTES } from "./sync-limits.ts";

test("assertSyncPayload — accepts watch/history, rejects anything else", () => {
  assert.equal(assertSyncPayload("watch", []), "watch");
  assert.equal(assertSyncPayload("history", []), "history");
  assert.throws(() => assertSyncPayload("todos", []), InvalidSyncPayloadError);
  assert.throws(() => assertSyncPayload(undefined, []), InvalidSyncPayloadError);
  assert.throws(() => assertSyncPayload({ kind: "watch" }, []), InvalidSyncPayloadError);
});

test("assertSyncPayload — rejects a payload over the per-kind byte ceiling", () => {
  const hugeWatch = Array.from({ length: 5000 }, (_, i) => ({ id: `pair-${i}`, note: "x".repeat(100) }));
  assert.ok(JSON.stringify(hugeWatch).length > SYNC_MAX_BYTES.watch);
  assert.throws(() => assertSyncPayload("watch", hugeWatch), InvalidSyncPayloadError);
});

test("assertSyncPayload — a realistic payload well under the ceiling passes", () => {
  const watch = Array.from({ length: 24 }, (_, i) => ({ id: `pair-${i}`, ticker: "BTCUSDT" }));
  assert.doesNotThrow(() => assertSyncPayload("watch", watch));
});

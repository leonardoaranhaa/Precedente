import assert from "node:assert/strict";
import { test } from "node:test";
import { isDigestDue, utcDayStart, withinHardCooldown } from "./digest-schedule.ts";

test("utcDayStart zera hora", () => {
  const t = Date.UTC(2026, 8, 3, 15, 30, 0);
  assert.equal(utcDayStart(t), Date.UTC(2026, 8, 3, 0, 0, 0));
});

test("isDigestDue: desligado nunca vence", () => {
  assert.equal(
    isDigestDue({ digestEnabled: false, digestHourUtc: 12, lastDigestAt: null, nowMs: Date.UTC(2026, 8, 3, 12) }),
    false,
  );
});

test("isDigestDue: hora certa e nunca enviado", () => {
  assert.equal(
    isDigestDue({ digestEnabled: true, digestHourUtc: 12, lastDigestAt: null, nowMs: Date.UTC(2026, 8, 3, 12, 5) }),
    true,
  );
});

test("isDigestDue: hora errada", () => {
  assert.equal(
    isDigestDue({ digestEnabled: true, digestHourUtc: 12, lastDigestAt: null, nowMs: Date.UTC(2026, 8, 3, 11, 59) }),
    false,
  );
});

test("isDigestDue: já enviou hoje", () => {
  const now = Date.UTC(2026, 8, 3, 12, 30);
  const earlier = Date.UTC(2026, 8, 3, 12, 5);
  assert.equal(
    isDigestDue({ digestEnabled: true, digestHourUtc: 12, lastDigestAt: earlier, nowMs: now }),
    false,
  );
});

test("isDigestDue: enviou ontem, hora certa de novo", () => {
  const now = Date.UTC(2026, 8, 3, 12, 0);
  const yesterday = Date.UTC(2026, 8, 2, 12, 0);
  assert.equal(
    isDigestDue({ digestEnabled: true, digestHourUtc: 12, lastDigestAt: yesterday, nowMs: now }),
    true,
  );
});

test("withinHardCooldown", () => {
  const now = Date.UTC(2026, 8, 3, 12);
  assert.equal(withinHardCooldown(null, now), false);
  assert.equal(withinHardCooldown(now - 5 * 60 * 60 * 1000, now), true);
  assert.equal(withinHardCooldown(now - 21 * 60 * 60 * 1000, now), false);
});

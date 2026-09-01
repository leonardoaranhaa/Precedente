import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { checkRateLimit, clientIp } from "./rate-limit.ts";

describe("checkRateLimit", () => {
  it("allows up to the limit, then blocks within the window", () => {
    const key = `test-${Math.random()}`;
    for (let i = 0; i < 5; i++) {
      assert.deepEqual(checkRateLimit(key, 5, 60_000), { allowed: true });
    }
    const blocked = checkRateLimit(key, 5, 60_000);
    assert.equal(blocked.allowed, false);
    if (!blocked.allowed) assert.ok(blocked.retryAfterSec > 0);
  });

  it("keys are independent — hitting the limit on one key doesn't affect another", () => {
    const a = `test-a-${Math.random()}`;
    const b = `test-b-${Math.random()}`;
    for (let i = 0; i < 3; i++) checkRateLimit(a, 3, 60_000);
    assert.equal(checkRateLimit(a, 3, 60_000).allowed, false);
    assert.equal(checkRateLimit(b, 3, 60_000).allowed, true);
  });
});

describe("clientIp", () => {
  // Confirmed via a live header dump against Railway's actual edge: it
  // writes x-forwarded-for as "<its own edge ip>, <ip that connected to
  // it>" — its own hop first, not appended last. Reading the first entry
  // (the naive/conventional reading) keys every request by Railway's own
  // small rotating edge-node pool, not the caller, which silently
  // defeats rate limiting entirely (confirmed live: 15 rapid requests,
  // limit 12, all succeeded — see PR history). The regression this test
  // guards against is exactly that: reverting to "first entry" would
  // still pass a synthetic single-hop test but silently break in prod.
  it("takes the LAST x-forwarded-for entry, not the first", () => {
    const req = new Request("https://example.com", {
      headers: { "x-forwarded-for": "160.79.106.128, 152.233.30.102" },
    });
    assert.equal(clientIp(req), "152.233.30.102");
  });

  it("handles a single-entry x-forwarded-for the same way", () => {
    const req = new Request("https://example.com", {
      headers: { "x-forwarded-for": "203.0.113.9" },
    });
    assert.equal(clientIp(req), "203.0.113.9");
  });

  it("falls back to x-real-ip when x-forwarded-for is absent", () => {
    const req = new Request("https://example.com", {
      headers: { "x-real-ip": "203.0.113.10" },
    });
    assert.equal(clientIp(req), "203.0.113.10");
  });

  it("falls back to 'unknown' when neither header is present", () => {
    const req = new Request("https://example.com");
    assert.equal(clientIp(req), "unknown");
  });
});

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CircuitOpenError, withCircuitBreaker, getAllBreakerStates, resetCircuitBreaker } from "./circuit-breaker.ts";

const OPTS = { failureThreshold: 3, cooldownMs: 50 };

describe("withCircuitBreaker", () => {
  it("stays closed and passes results through while calls succeed", async () => {
    const name = `svc-ok-${Math.random()}`;
    const result = await withCircuitBreaker(name, OPTS, async () => "ok");
    assert.equal(result, "ok");
    assert.equal(getAllBreakerStates()[name]!.state, "closed");
  });

  it("trips open after N consecutive failures, and fails fast without calling fn", async () => {
    const name = `svc-fail-${Math.random()}`;
    for (let i = 0; i < OPTS.failureThreshold; i++) {
      await assert.rejects(
        () =>
          withCircuitBreaker(name, OPTS, async () => {
            throw new Error("boom");
          }),
        /boom/,
      );
    }
    assert.equal(getAllBreakerStates()[name]!.state, "open");

    let called = false;
    await assert.rejects(
      () =>
        withCircuitBreaker(name, OPTS, async () => {
          called = true;
          return "unreachable";
        }),
      CircuitOpenError,
    );
    assert.equal(called, false, "fn must not run while the breaker is open");
  });

  it("a single success resets the failure count back to zero", async () => {
    const name = `svc-recover-${Math.random()}`;
    await assert.rejects(() =>
      withCircuitBreaker(name, OPTS, async () => {
        throw new Error("boom");
      }),
    );
    await assert.rejects(() =>
      withCircuitBreaker(name, OPTS, async () => {
        throw new Error("boom");
      }),
    );
    assert.equal(getAllBreakerStates()[name]!.consecutiveFailures, 2);

    await withCircuitBreaker(name, OPTS, async () => "ok");
    assert.equal(getAllBreakerStates()[name]!.consecutiveFailures, 0);
    assert.equal(getAllBreakerStates()[name]!.state, "closed");
  });

  it("after the cooldown elapses, lets one probe call through again", async () => {
    const name = `svc-cooldown-${Math.random()}`;
    const opts = { failureThreshold: 1, cooldownMs: 20 };
    await assert.rejects(() =>
      withCircuitBreaker(name, opts, async () => {
        throw new Error("boom");
      }),
    );
    assert.equal(getAllBreakerStates()[name]!.state, "open");

    // Still inside the cooldown window — fails fast without calling fn.
    let calledTooSoon = false;
    await assert.rejects(
      () =>
        withCircuitBreaker(name, opts, async () => {
          calledTooSoon = true;
          return "x";
        }),
      CircuitOpenError,
    );
    assert.equal(calledTooSoon, false);

    await new Promise((resolve) => setTimeout(resolve, opts.cooldownMs + 10));

    const result = await withCircuitBreaker(name, opts, async () => "recovered");
    assert.equal(result, "recovered");
    assert.equal(getAllBreakerStates()[name]!.state, "closed");
  });

  it("isFailure lets expected errors pass through without tripping the breaker", async () => {
    const name = `svc-expected-${Math.random()}`;
    const opts = {
      failureThreshold: 2,
      cooldownMs: 50,
      isFailure: (err: unknown) => !(err instanceof Error && err.message === "not found"),
    };
    for (let i = 0; i < 5; i++) {
      await assert.rejects(
        () =>
          withCircuitBreaker(name, opts, async () => {
            throw new Error("not found");
          }),
        /not found/,
      );
    }
    assert.equal(getAllBreakerStates()[name]!.state, "closed");
    assert.equal(getAllBreakerStates()[name]!.consecutiveFailures, 0);
  });

  it("resetCircuitBreaker clears a breaker's tracked state", async () => {
    const name = `svc-reset-${Math.random()}`;
    await assert.rejects(() =>
      withCircuitBreaker(name, { failureThreshold: 1, cooldownMs: 50 }, async () => {
        throw new Error("boom");
      }),
    );
    assert.ok(getAllBreakerStates()[name]);
    resetCircuitBreaker(name);
    assert.equal(getAllBreakerStates()[name], undefined);
  });
});

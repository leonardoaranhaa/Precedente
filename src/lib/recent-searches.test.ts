import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";

// Minimal localStorage shim for Node
const store = new Map<string, string>();
(globalThis as Record<string, unknown>).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => store.set(k, v),
  removeItem: (k: string) => store.delete(k),
};

const { loadRecentSearches, pushRecentSearch } = await import("./recent-searches.ts");

describe("recent-searches", () => {
  beforeEach(() => store.clear());

  it("returns empty when nothing stored", () => {
    assert.deepStrictEqual(loadRecentSearches(), []);
  });

  it("stores and retrieves tickers", () => {
    pushRecentSearch("BTC");
    pushRecentSearch("ETH");
    assert.deepStrictEqual(loadRecentSearches(), ["ETH", "BTC"]);
  });

  it("deduplicates and moves to front", () => {
    pushRecentSearch("BTC");
    pushRecentSearch("ETH");
    pushRecentSearch("BTC");
    assert.deepStrictEqual(loadRecentSearches(), ["BTC", "ETH"]);
  });

  it("uppercases", () => {
    pushRecentSearch("btc");
    assert.deepStrictEqual(loadRecentSearches(), ["BTC"]);
  });

  it("caps at 8", () => {
    for (const t of ["A", "B", "C", "D", "E", "F", "G", "H", "I"]) pushRecentSearch(t);
    const list = loadRecentSearches();
    assert.equal(list.length, 8);
    assert.equal(list[0], "I");
    assert.ok(!list.includes("A"));
  });

  it("ignores empty strings", () => {
    pushRecentSearch("");
    assert.deepStrictEqual(loadRecentSearches(), []);
  });
});

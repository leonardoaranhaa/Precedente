import assert from "node:assert/strict";
import { test } from "node:test";
import { filterNewsForPreferences, matchesPreferences } from "./filter.ts";
import { DEFAULT_NEWS_PREFERENCES, type NewsItem, type NewsPreferences } from "./types.ts";

function item(overrides: Partial<NewsItem> = {}): NewsItem {
  return {
    id: "https://example.com/x",
    title: "Título",
    link: "https://example.com/x",
    source: "Fonte",
    publishedAt: Date.now(),
    coins: ["BTC"],
    categories: ["market"],
    ...overrides,
  };
}

function prefs(p: Partial<NewsPreferences> = {}): NewsPreferences {
  return { ...DEFAULT_NEWS_PREFERENCES, ...p };
}

test("matchesPreferences: preferências vazias aceitam qualquer item", () => {
  assert.equal(matchesPreferences(item(), prefs({ coins: [], categories: [] })), true);
});

test("matchesPreferences: filtra por moeda", () => {
  assert.equal(matchesPreferences(item({ coins: ["ETH"] }), prefs({ coins: ["BTC"] })), false);
  assert.equal(
    matchesPreferences(item({ coins: ["BTC", "ETH"] }), prefs({ coins: ["BTC"] })),
    true,
  );
});

test("matchesPreferences: filtra por categoria", () => {
  assert.equal(
    matchesPreferences(item({ categories: ["security"] }), prefs({ categories: ["regulatory"] })),
    false,
  );
  assert.equal(
    matchesPreferences(
      item({ categories: ["security", "regulatory"] }),
      prefs({ categories: ["regulatory"] }),
    ),
    true,
  );
});

test("matchesPreferences: exige moeda E categoria quando ambos filtrados", () => {
  const i = item({ coins: ["BTC"], categories: ["market"] });
  assert.equal(matchesPreferences(i, prefs({ coins: ["BTC"], categories: ["security"] })), false);
  assert.equal(matchesPreferences(i, prefs({ coins: ["ETH"], categories: ["market"] })), false);
  assert.equal(matchesPreferences(i, prefs({ coins: ["BTC"], categories: ["market"] })), true);
});

test("filterNewsForPreferences filtra a lista inteira", () => {
  const items = [
    item({ id: "1", coins: ["BTC"] }),
    item({ id: "2", coins: ["ETH"] }),
    item({ id: "3", coins: ["BTC", "SOL"] }),
  ];
  const result = filterNewsForPreferences(items, prefs({ coins: ["BTC"] }));
  assert.deepEqual(
    result.map((i) => i.id),
    ["1", "3"],
  );
});

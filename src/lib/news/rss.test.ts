import assert from "node:assert/strict";
import { test } from "node:test";
import { parseRssFeed } from "./rss.ts";

const RSS_2_0 = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>Fake Crypto News</title>
  <item>
    <title><![CDATA[Bitcoin & Ethereum rally as SEC softens tone]]></title>
    <link>https://example.com/a?utm_source=feed</link>
    <pubDate>Wed, 02 Sep 2026 20:00:00 GMT</pubDate>
    <description><![CDATA[<p>Prices moved &amp; regulators reacted.</p>]]></description>
  </item>
  <item>
    <title>Solana network upgrade goes live</title>
    <link>https://example.com/b</link>
    <pubDate>Wed, 02 Sep 2026 18:00:00 GMT</pubDate>
    <description>Validators report no issues.</description>
  </item>
</channel>
</rss>`;

const ATOM = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Fake Atom Feed</title>
  <entry>
    <title>Atom-based crypto headline</title>
    <link rel="alternate" href="https://example.com/atom-1"/>
    <updated>2026-09-02T12:00:00Z</updated>
    <summary>Summary text here.</summary>
  </entry>
</feed>`;

test("parseRssFeed extrai título, link, data e descrição de RSS 2.0", () => {
  const items = parseRssFeed(RSS_2_0);
  assert.equal(items.length, 2);
  assert.equal(items[0]!.title, "Bitcoin & Ethereum rally as SEC softens tone");
  assert.equal(items[0]!.link, "https://example.com/a?utm_source=feed");
  assert.equal(items[0]!.publishedAt, Date.parse("Wed, 02 Sep 2026 20:00:00 GMT"));
});

test("parseRssFeed decodifica CDATA e entidades HTML, remove tags soltas", () => {
  const items = parseRssFeed(RSS_2_0);
  assert.equal(items[0]!.description, "Prices moved & regulators reacted.");
});

test("parseRssFeed cai pra Atom quando não há <item>", () => {
  const items = parseRssFeed(ATOM);
  assert.equal(items.length, 1);
  assert.equal(items[0]!.title, "Atom-based crypto headline");
  assert.equal(items[0]!.link, "https://example.com/atom-1");
  assert.equal(items[0]!.publishedAt, Date.parse("2026-09-02T12:00:00Z"));
});

test("parseRssFeed descarta item sem título ou sem link em vez de quebrar", () => {
  const broken = `<rss><channel><item><title>Sem link</title></item></channel></rss>`;
  assert.deepEqual(parseRssFeed(broken), []);
});

test("parseRssFeed em XML vazio/inválido retorna lista vazia", () => {
  assert.deepEqual(parseRssFeed(""), []);
  assert.deepEqual(parseRssFeed("not xml at all"), []);
});

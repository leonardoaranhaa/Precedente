/**
 * Health check dos feeds RSS — só status factual (ok/falha/latência).
 * Não interpreta manchetes; serve monitoramento do pipeline de notícias.
 */

import { NEWS_SOURCES } from "./sources.ts";

export type FeedHealth = {
  name: string;
  url: string;
  ok: boolean;
  status: number | null;
  latencyMs: number;
  error: string | null;
};

export type RssHealthReport = {
  checkedAt: number;
  total: number;
  ok: number;
  failed: number;
  feeds: FeedHealth[];
  healthy: boolean;
};

async function probe(url: string, timeoutMs = 12_000): Promise<{ status: number; latencyMs: number }> {
  const t0 = Date.now();
  const res = await fetch(url, {
    headers: { Accept: "application/rss+xml, application/xml, text/xml, */*" },
    signal: AbortSignal.timeout(timeoutMs),
  });
  return { status: res.status, latencyMs: Date.now() - t0 };
}

export async function checkRssHealth(): Promise<RssHealthReport> {
  const feeds: FeedHealth[] = [];
  for (const src of NEWS_SOURCES) {
    try {
      const { status, latencyMs } = await probe(src.url);
      const ok = status >= 200 && status < 400;
      feeds.push({
        name: src.name,
        url: src.url,
        ok,
        status,
        latencyMs,
        error: ok ? null : `HTTP ${status}`,
      });
    } catch (err) {
      feeds.push({
        name: src.name,
        url: src.url,
        ok: false,
        status: null,
        latencyMs: 0,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  const okCount = feeds.filter((f) => f.ok).length;
  return {
    checkedAt: Date.now(),
    total: feeds.length,
    ok: okCount,
    failed: feeds.length - okCount,
    feeds,
    healthy: okCount > 0,
  };
}

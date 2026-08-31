//#region node_modules/.nitro/vite/services/ssr/assets/exchange-DXgfz_jr.js
var BASES = ["https://data-api.binance.vision", "https://api.binance.com"];
var INTERVAL_MS = {
	"15m": 9e5,
	"1h": 36e5,
	"4h": 144e5,
	"1d": 864e5
};
var TARGET_BARS = 1500;
var PAGE = 1e3;
function parseKline(row) {
	return {
		t: row[0],
		o: Number(row[1]),
		h: Number(row[2]),
		l: Number(row[3]),
		c: Number(row[4]),
		v: Number(row[5])
	};
}
async function fetchPage(base, symbol, interval, startTime) {
	const url = new URL(`${base}/api/v3/klines`);
	url.searchParams.set("symbol", symbol);
	url.searchParams.set("interval", interval);
	url.searchParams.set("limit", String(PAGE));
	url.searchParams.set("startTime", String(startTime));
	const res = await fetch(url, {
		headers: { Accept: "application/json" },
		signal: AbortSignal.timeout(12e3)
	});
	if (res.status === 400) throw new Error(`Par ${symbol} não encontrado na Binance. Confira o ticker.`);
	if (!res.ok) throw new Error(`Binance indisponível (${res.status}). Tente de novo em instantes.`);
	const raw = await res.json();
	if (!Array.isArray(raw)) throw new Error("Resposta inesperada da Binance.");
	return raw.map(parseKline);
}
/**
* CCXT-shaped fetchOHLCV against Binance public REST (no API key).
* Same OHLC a `ccxt.binance.fetchOHLCV` would return for a USDT pair.
*/
async function fetchOHLCV(symbol, interval) {
	let lastError = null;
	for (const base of BASES) try {
		const ms = INTERVAL_MS[interval];
		const first = await fetchPage(base, symbol, interval, Date.now() - TARGET_BARS * ms);
		if (first.length === 0) throw new Error(`Sem candles para ${symbol} neste tempo gráfico.`);
		let candles = first;
		if (first.length === PAGE) {
			const second = await fetchPage(base, symbol, interval, first[first.length - 1].t + ms);
			const seen = new Set(candles.map((c) => c.t));
			for (const c of second) if (!seen.has(c.t)) candles.push(c);
		}
		candles.sort((a, b) => a.t - b.t);
		return {
			candles,
			source: "Binance"
		};
	} catch (err) {
		lastError = err instanceof Error ? err : new Error(String(err));
		if (lastError.message.includes("não encontrado")) throw lastError;
	}
	throw lastError ?? /* @__PURE__ */ new Error("Não foi possível ler a Binance agora.");
}
//#endregion
export { fetchOHLCV };

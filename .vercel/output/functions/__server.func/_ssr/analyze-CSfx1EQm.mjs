import { n as TSS_SERVER_FUNCTION, t as createServerFn } from "./ssr.mjs";
import { i as fingerprintLabel, l as horizonCaption, n as TIMEFRAMES, r as displayTicker, u as normalizeTicker } from "./types-CavFGrUc.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/analyze-CSfx1EQm.js
var createServerRpc = (serverFnMeta, splitImportFn) => {
	const url = "/_serverFn/" + serverFnMeta.id;
	return Object.assign(splitImportFn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
function sma(values, period) {
	const out = Array(values.length).fill(null);
	if (period <= 0 || values.length < period) return out;
	let sum = 0;
	for (let i = 0; i < values.length; i++) {
		sum += values[i];
		if (i >= period) sum -= values[i - period];
		if (i >= period - 1) out[i] = sum / period;
	}
	return out;
}
/** Wilder RSI. Returns null until the first full period. */
function rsi(closes, period = 14) {
	const out = Array(closes.length).fill(null);
	if (closes.length < period + 1) return out;
	let gain = 0;
	let loss = 0;
	for (let i = 1; i <= period; i++) {
		const d = closes[i] - closes[i - 1];
		if (d >= 0) gain += d;
		else loss -= d;
	}
	let avgGain = gain / period;
	let avgLoss = loss / period;
	out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
	for (let i = period + 1; i < closes.length; i++) {
		const d = closes[i] - closes[i - 1];
		const g = d > 0 ? d : 0;
		const l = d < 0 ? -d : 0;
		avgGain = (avgGain * (period - 1) + g) / period;
		avgLoss = (avgLoss * (period - 1) + l) / period;
		out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
	}
	return out;
}
function rollingHigh(values, period) {
	const out = Array(values.length).fill(null);
	for (let i = 0; i < values.length; i++) {
		if (i < period - 1) continue;
		let m = -Infinity;
		for (let j = i - period + 1; j <= i; j++) m = Math.max(m, values[j]);
		out[i] = m;
	}
	return out;
}
function rollingLow(values, period) {
	const out = Array(values.length).fill(null);
	for (let i = 0; i < values.length; i++) {
		if (i < period - 1) continue;
		let m = Infinity;
		for (let j = i - period + 1; j <= i; j++) m = Math.min(m, values[j]);
		out[i] = m;
	}
	return out;
}
function consecutiveDirection(candles, index) {
	if (index <= 0) return 0;
	const sign = candles[index].c >= candles[index].o ? 1 : -1;
	let n = 1;
	for (let i = index - 1; i >= 0; i--) {
		if ((candles[i].c >= candles[i].o ? 1 : -1) !== sign) break;
		n += 1;
	}
	return sign * n;
}
function lastSwing(candles, index, lookback = 4) {
	const start = Math.max(lookback, 1);
	const end = index - lookback;
	for (let i = end; i >= start; i--) {
		let isTop = true;
		let isBot = true;
		for (let k = 1; k <= lookback; k++) {
			if (candles[i].h <= candles[i - k].h || candles[i].h <= candles[i + k].h) isTop = false;
			if (candles[i].l >= candles[i - k].l || candles[i].l >= candles[i + k].l) isBot = false;
		}
		if (isTop) return {
			type: "top",
			barsAgo: index - i,
			price: candles[i].h
		};
		if (isBot) return {
			type: "bottom",
			barsAgo: index - i,
			price: candles[i].l
		};
	}
	return null;
}
function percentile(values, p) {
	if (values.length === 0) return 0;
	const sorted = [...values].sort((a, b) => a - b);
	const idx = (sorted.length - 1) * p;
	const lo = Math.floor(idx);
	const hi = Math.ceil(idx);
	if (lo === hi) return sorted[lo];
	return sorted[lo] * (hi - idx) + sorted[hi] * (idx - lo);
}
function median(values) {
	return percentile(values, .5);
}
var HORIZONS = [
	5,
	10,
	20
];
var CHART_BARS = 120;
function rsiBucket(value) {
	if (value < 20) return "0-20";
	if (value < 30) return "20-30";
	if (value < 40) return "30-40";
	if (value < 50) return "40-50";
	if (value < 60) return "50-60";
	if (value < 70) return "60-70";
	if (value < 80) return "70-80";
	return "80-100";
}
function vsMa(price, ma) {
	const pct = (price - ma) / ma;
	if (Math.abs(pct) < .004) return "near";
	return pct > 0 ? "above" : "below";
}
function extremeOf(price, high20, low20) {
	if (high20 > 0 && (high20 - price) / high20 <= .005) return "high20";
	if (low20 > 0 && (price - low20) / low20 <= .005) return "low20";
	return "none";
}
function flatThreshold(tf) {
	switch (tf) {
		case "15m": return .15;
		case "1h": return .25;
		case "4h": return .4;
		case "1d": return .6;
	}
}
function fingerprintAt(i, closes, rsiArr, sma20, sma50, high20, low20, candles) {
	const r = rsiArr[i];
	const s20 = sma20[i];
	const s50 = sma50[i];
	const h20 = high20[i];
	const l20 = low20[i];
	const close = closes[i];
	const candle = candles[i];
	if (r == null || s20 == null || s50 == null || h20 == null || l20 == null || close == null || candle == null) return null;
	return {
		rsiBucket: rsiBucket(r),
		vsSma20: vsMa(close, s20),
		vsSma50: vsMa(close, s50),
		extreme: extremeOf(close, h20, l20),
		direction: candle.c >= candle.o ? "up" : "down"
	};
}
function sameCore(a, b) {
	return a.rsiBucket === b.rsiBucket && a.direction === b.direction;
}
function scoreMatch(target, candidate) {
	if (!sameCore(target, candidate)) return 0;
	let score = 2;
	if (candidate.vsSma20 === target.vsSma20) score += 1;
	if (candidate.vsSma50 === target.vsSma50) score += 1;
	if (candidate.extreme === target.extreme) score += 1;
	return score;
}
function buildHorizon(tf, bars, matchIdx, closes) {
	const flat = flatThreshold(tf);
	const returns = [];
	const paths = [];
	for (const i of matchIdx) {
		if (i + bars >= closes.length) continue;
		const base = closes[i];
		if (base <= 0) continue;
		const fwd = (closes[i + bars] - base) / base * 100;
		returns.push(fwd);
		const path = [];
		for (let k = 1; k <= bars; k++) path.push((closes[i + k] - base) / base * 100);
		paths.push(path);
	}
	const up = returns.filter((r) => r > flat).length;
	const down = returns.filter((r) => r < -flat).length;
	const n = returns.length;
	const flatN = n - up - down;
	const medianPath = [];
	for (let k = 0; k < bars; k++) {
		const col = paths.map((p) => p[k]).filter((v) => Number.isFinite(v));
		medianPath.push(median(col));
	}
	return {
		bars,
		label: horizonCaption(tf, bars),
		samples: n,
		upPct: n ? up / n * 100 : 0,
		downPct: n ? down / n * 100 : 0,
		flatPct: n ? flatN / n * 100 : 0,
		medianPct: median(returns),
		meanPct: n ? returns.reduce((a, b) => a + b, 0) / n : 0,
		p10: percentile(returns, .1),
		p90: percentile(returns, .9),
		medianPath
	};
}
function analyzeSeries(candles, timeframe) {
	if (candles.length < 80) throw new Error("Histórico insuficiente para estatística — tente outro par ou um tempo gráfico maior.");
	const closes = candles.map((c) => c.c);
	const highs = candles.map((c) => c.h);
	const lows = candles.map((c) => c.l);
	const rsiArr = rsi(closes, 14);
	const sma20 = sma(closes, 20);
	const sma50 = sma(closes, 50);
	const sma200 = sma(closes, 200);
	const high20 = rollingHigh(highs, 20);
	const low20 = rollingLow(lows, 20);
	const last = candles.length - 1;
	const target = fingerprintAt(last, closes, rsiArr, sma20, sma50, high20, low20, candles);
	if (!target) throw new Error("Ainda não há indicadores suficientes neste histórico.");
	const maxHorizon = HORIZONS[HORIZONS.length - 1];
	const candidates = [];
	for (let i = 50; i < last - maxHorizon; i++) {
		const fp = fingerprintAt(i, closes, rsiArr, sma20, sma50, high20, low20, candles);
		if (!fp) continue;
		const score = scoreMatch(target, fp);
		if (score >= 2) candidates.push({
			i,
			score
		});
	}
	let used = candidates.filter((c) => c.score >= 5);
	const relaxed = [];
	if (used.length < 12) {
		used = candidates.filter((c) => c.score >= 4);
		if (used.length >= 12) relaxed.push("extrema de 20 barras");
	}
	if (used.length < 12) {
		used = candidates.filter((c) => c.score >= 3);
		if (used.length >= 12) relaxed.push("posição vs SMA50");
	}
	if (used.length < 12) {
		used = candidates.filter((c) => c.score >= 2);
		if (candidates.length) relaxed.push("posição vs SMA20");
	}
	const matchIdx = used.map((c) => c.i);
	const horizons = HORIZONS.map((h) => buildHorizon(timeframe, h, matchIdx, closes));
	let sampleNote = "ok";
	if (matchIdx.length < 8) sampleNote = "tiny";
	else if (matchIdx.length < 20) sampleNote = "small";
	const lastHorizon = horizons[horizons.length - 1];
	const recentMatches = [...matchIdx].sort((a, b) => b - a).slice(0, 6).map((i) => {
		const fwdIdx = Math.min(i + lastHorizon.bars, candles.length - 1);
		const base = closes[i];
		return {
			t: candles[i].t,
			forward: base > 0 ? (closes[fwdIdx] - base) / base * 100 : 0
		};
	});
	const lastCandle = candles[last];
	const prev = last > 0 ? candles[last - 1] : null;
	const s20 = sma20[last];
	const s50 = sma50[last];
	const h20 = high20[last];
	const l20 = low20[last];
	const snapshot = {
		last: lastCandle,
		prev,
		rsi14: rsiArr[last],
		sma20: s20,
		sma50: s50,
		sma200: sma200[last],
		distSma20Pct: (lastCandle.c - s20) / s20 * 100,
		distSma50Pct: (lastCandle.c - s50) / s50 * 100,
		high20: h20,
		low20: l20,
		near20High: target.extreme === "high20",
		near20Low: target.extreme === "low20",
		consecutive: consecutiveDirection(candles, last),
		lastExtrema: lastSwing(candles, last),
		changePct: prev ? (lastCandle.c - prev.c) / prev.c * 100 : 0
	};
	const from = Math.max(0, candles.length - CHART_BARS);
	return {
		snapshot,
		chart: candles.slice(from).map((c, idx) => {
			const i = from + idx;
			return {
				t: c.t,
				o: c.o,
				h: c.h,
				l: c.l,
				c: c.c,
				sma20: sma20[i],
				sma50: sma50[i]
			};
		}),
		precedent: {
			fingerprint: target,
			fingerprintLabel: fingerprintLabel(target),
			matches: matchIdx.length,
			total: last - maxHorizon - 50,
			relaxed,
			sampleNote,
			horizons,
			recentMatches
		}
	};
}
var VISION_PROMPT = `Você está lendo um print de gráfico de trading. Descreva APENAS o que é visível.

Regras:
- Nunca recomende comprar, vender, entrar ou sair.
- Não invente preços, indicadores ou padrões que não estejam claramente no print.
- Se o print estiver cortado, desfocado ou não for um gráfico, diga isso.
- Responda SOMENTE um JSON válido, sem markdown, neste formato:
{
  "tendencia": "alta" | "baixa" | "lateral" | "indefinida",
  "padrao": string | null,
  "suporte_resistencia": string | null,
  "indicadores_visiveis": string[],
  "timeframe_aparente": string | null,
  "ativo_aparente": string | null,
  "leitura": string,
  "confianca": "alta" | "media" | "baixa"
}
"leitura" tem 2 a 4 frases, factual, em português.`;
function parseVision(text) {
	const trimmed = text.trim();
	const fenced = trimmed.match(/\{[\s\S]*\}/);
	const raw = fenced ? fenced[0] : trimmed;
	const json = JSON.parse(raw);
	const tendenciaRaw = String(json.tendencia ?? "indefinida");
	const tendencia = tendenciaRaw === "alta" || tendenciaRaw === "baixa" || tendenciaRaw === "lateral" || tendenciaRaw === "indefinida" ? tendenciaRaw : "indefinida";
	const confRaw = String(json.confianca ?? "media");
	const confianca = confRaw === "alta" || confRaw === "baixa" ? confRaw : "media";
	return {
		tendencia,
		padrao: json.padrao ? String(json.padrao) : null,
		suporteResistencia: json.suporte_resistencia ? String(json.suporte_resistencia) : null,
		indicadoresVisiveis: Array.isArray(json.indicadores_visiveis) ? json.indicadores_visiveis.map((x) => String(x)).slice(0, 8) : [],
		timeframeAparente: json.timeframe_aparente ? String(json.timeframe_aparente) : null,
		ativoAparente: json.ativo_aparente ? String(json.ativo_aparente) : null,
		leitura: String(json.leitura ?? trimmed).slice(0, 800),
		confianca
	};
}
async function readChart(imageDataUrl) {
	const apiKey = process.env.XAI_API_KEY;
	if (!apiKey) throw new Error("Leitura visual indisponível neste ambiente.");
	const res = await fetch("https://api.x.ai/v1/chat/completions", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${apiKey}`
		},
		signal: AbortSignal.timeout(28e3),
		body: JSON.stringify({
			model: "grok-4.5",
			temperature: .2,
			max_tokens: 700,
			messages: [{
				role: "user",
				content: [{
					type: "image_url",
					image_url: {
						url: imageDataUrl,
						detail: "high"
					}
				}, {
					type: "text",
					text: VISION_PROMPT
				}]
			}]
		})
	});
	if (!res.ok) throw new Error(`Leitura visual falhou (${res.status}).`);
	const text = (await res.json()).choices?.[0]?.message?.content ?? "";
	if (!text) throw new Error("A leitura visual voltou vazia.");
	try {
		return parseVision(text);
	} catch {
		return {
			tendencia: "indefinida",
			padrao: null,
			suporteResistencia: null,
			indicadoresVisiveis: [],
			timeframeAparente: null,
			ativoAparente: null,
			leitura: text.slice(0, 800),
			confianca: "baixa"
		};
	}
}
var analyzeSetup_createServerFn_handler = createServerRpc({
	id: "c7aade2d1da73c515095d432d3d5ae2dda909eab2e45307ca8affe90d119707c",
	name: "analyzeSetup",
	filename: "src/lib/analyze.ts"
}, (opts) => analyzeSetup.__executeServer(opts));
var analyzeSetup = createServerFn({ method: "POST" }).validator((input) => {
	if (!input || typeof input !== "object") throw new Error("Pedido inválido.");
	const ticker = normalizeTicker(String(input.ticker ?? ""));
	if (!/^[A-Z0-9]{5,20}$/.test(ticker)) throw new Error("Ticker inválido. Ex.: BTC, ETHUSDT, SOL.");
	const timeframe = input.timeframe;
	if (!TIMEFRAMES.includes(timeframe)) throw new Error("Tempo gráfico inválido.");
	const imageDataUrl = typeof input.imageDataUrl === "string" && input.imageDataUrl.startsWith("data:image/") ? input.imageDataUrl : null;
	if (imageDataUrl && imageDataUrl.length > 18e5) throw new Error("Print grande demais. Envie um recorte do gráfico.");
	return {
		ticker,
		timeframe,
		imageDataUrl
	};
}).handler(analyzeSetup_createServerFn_handler, async ({ data }) => {
	const { fetchOHLCV } = await import("./exchange-DXgfz_jr.mjs");
	const marketPromise = fetchOHLCV(data.ticker, data.timeframe).then((m) => ({
		...m,
		stats: analyzeSeries(m.candles, data.timeframe)
	}));
	const visionPromise = data.imageDataUrl ? readChart(data.imageDataUrl).then((vision) => ({
		vision,
		visionError: null
	})).catch((err) => ({
		vision: null,
		visionError: err instanceof Error ? err.message : "Não foi possível ler o print."
	})) : Promise.resolve({
		vision: null,
		visionError: null
	});
	const [market, visionPart] = await Promise.all([marketPromise, visionPromise]);
	return {
		ticker: data.ticker,
		displayTicker: displayTicker(data.ticker),
		timeframe: data.timeframe,
		fetchedAt: Date.now(),
		candleCount: market.candles.length,
		snapshot: market.stats.snapshot,
		precedent: market.stats.precedent,
		chart: market.stats.chart,
		vision: visionPart.vision,
		visionError: visionPart.visionError,
		source: market.source
	};
});
//#endregion
export { analyzeSetup_createServerFn_handler };

//#region node_modules/.nitro/vite/services/ssr/assets/types-CavFGrUc.js
function displayTicker(symbol) {
	for (const q of [
		"USDT",
		"BUSD",
		"USDC",
		"BRL",
		"FDUSD",
		"BTC",
		"ETH"
	]) if (symbol.endsWith(q) && symbol.length > q.length) return `${symbol.slice(0, -q.length)}/${q}`;
	return symbol;
}
function shortTicker(symbol) {
	return displayTicker(symbol).split("/")[0] ?? symbol;
}
function normalizeTicker(raw) {
	let s = raw.trim().toUpperCase().replace(/[\s\-_]/g, "");
	s = s.replace("/", "");
	if (!s) return "";
	if (/^[A-Z0-9]{2,10}$/.test(s) && !/(USDT|USDC|BUSD|BRL|FDUSD)$/.test(s)) s = `${s}USDT`;
	return s;
}
function timeframeLabel(tf) {
	switch (tf) {
		case "15m": return "15 min";
		case "1h": return "1 hora";
		case "4h": return "4 horas";
		case "1d": return "diário";
	}
}
function barsToHuman(tf, bars) {
	const total = {
		"15m": 15,
		"1h": 60,
		"4h": 240,
		"1d": 1440
	}[tf] * bars;
	if (total < 60) return `${total} min`;
	if (total < 1440) {
		const h = total / 60;
		return Number.isInteger(h) ? `${h}h` : `${h.toFixed(1).replace(".", ",")}h`;
	}
	const d = total / 1440;
	return Number.isInteger(d) ? `${d}d` : `${d.toFixed(1).replace(".", ",")}d`;
}
function horizonCaption(tf, bars) {
	return `${bars} candles · ${barsToHuman(tf, bars)}`;
}
function maLabel(side, name) {
	if (side === "near") return `junto da ${name}`;
	if (side === "above") return `acima da ${name}`;
	return `abaixo da ${name}`;
}
function extremeLabel(e) {
	if (e === "high20") return "junto da máxima de 20 barras";
	if (e === "low20") return "junto da mínima de 20 barras";
	return "longe das extremas de 20 barras";
}
function fingerprintLabel(fp) {
	const dir = fp.direction === "up" ? "candle de alta" : "candle de baixa";
	return [
		`RSI ${fp.rsiBucket.replace("-", "–")}`,
		maLabel(fp.vsSma20, "SMA20"),
		maLabel(fp.vsSma50, "SMA50"),
		extremeLabel(fp.extreme),
		dir
	].join(" · ");
}
function formatPct(n, digits = 2) {
	return `${n > 0 ? "+" : ""}${n.toFixed(digits).replace(".", ",")}%`;
}
function formatPrice(n) {
	if (!Number.isFinite(n)) return "—";
	const digits = n >= 1e3 ? 2 : n >= 1 ? 4 : 6;
	return n.toLocaleString("pt-BR", {
		minimumFractionDigits: 2,
		maximumFractionDigits: digits
	});
}
function formatInt(n) {
	return n.toLocaleString("pt-BR");
}
function formatWhen(ts) {
	return new Date(ts).toLocaleString("pt-BR", {
		day: "2-digit",
		month: "short",
		hour: "2-digit",
		minute: "2-digit"
	});
}
var TIMEFRAMES = [
	"15m",
	"1h",
	"4h",
	"1d"
];
var POPULAR_TICKERS = [
	"BTCUSDT",
	"ETHUSDT",
	"SOLUSDT",
	"BNBUSDT",
	"XRPUSDT",
	"DOGEUSDT",
	"LINKUSDT",
	"AVAXUSDT",
	"SUIUSDT",
	"ADAUSDT"
];
//#endregion
export { formatInt as a, formatWhen as c, shortTicker as d, timeframeLabel as f, fingerprintLabel as i, horizonCaption as l, TIMEFRAMES as n, formatPct as o, displayTicker as r, formatPrice as s, POPULAR_TICKERS as t, normalizeTicker as u };

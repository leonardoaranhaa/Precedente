import type { Extreme, Fingerprint, MaSide, Timeframe } from "./types.ts";

export function displayTicker(symbol: string): string {
  const quotes = ["USDT", "BUSD", "USDC", "BRL", "FDUSD", "BTC", "ETH"];
  for (const q of quotes) {
    if (symbol.endsWith(q) && symbol.length > q.length) {
      return `${symbol.slice(0, -q.length)}/${q}`;
    }
  }
  return symbol;
}

export function shortTicker(symbol: string): string {
  return displayTicker(symbol).split("/")[0] ?? symbol;
}

export function normalizeTicker(raw: string): string {
  let s = raw.trim().toUpperCase().replace(/[\s\-_]/g, "");
  s = s.replace("/", "");
  if (!s) return "";
  if (/^[A-Z0-9]{2,10}$/.test(s) && !/(USDT|USDC|BUSD|BRL|FDUSD)$/.test(s)) {
    s = `${s}USDT`;
  }
  return s;
}

export function timeframeLabel(tf: Timeframe): string {
  switch (tf) {
    case "15m":
      return "15 min";
    case "1h":
      return "1 hora";
    case "4h":
      return "4 horas";
    case "1d":
      return "diário";
  }
}

export function barsToHuman(tf: Timeframe, bars: number): string {
  const minutes: Record<Timeframe, number> = {
    "15m": 15,
    "1h": 60,
    "4h": 240,
    "1d": 1440,
  };
  const total = minutes[tf] * bars;
  if (total < 60) return `${total} min`;
  if (total < 1440) {
    const h = total / 60;
    return Number.isInteger(h) ? `${h}h` : `${h.toFixed(1).replace(".", ",")}h`;
  }
  const d = total / 1440;
  return Number.isInteger(d) ? `${d}d` : `${d.toFixed(1).replace(".", ",")}d`;
}

export function horizonCaption(tf: Timeframe, bars: number): string {
  return `${bars} candles · ${barsToHuman(tf, bars)}`;
}

function maLabel(side: MaSide, name: string): string {
  if (side === "near") return `junto da ${name}`;
  if (side === "above") return `acima da ${name}`;
  return `abaixo da ${name}`;
}

function extremeLabel(e: Extreme): string {
  if (e === "high20") return "junto da máxima de 20 barras";
  if (e === "low20") return "junto da mínima de 20 barras";
  return "longe das extremas de 20 barras";
}

export function fingerprintLabel(fp: Fingerprint): string {
  const dir = fp.direction === "up" ? "candle de alta" : "candle de baixa";
  return [
    `RSI ${fp.rsiBucket.replace("-", "–")}`,
    maLabel(fp.vsSma20, "SMA20"),
    maLabel(fp.vsSma50, "SMA50"),
    extremeLabel(fp.extreme),
    dir,
  ].join(" · ");
}

export function formatPct(n: number, digits = 2): string {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(digits).replace(".", ",")}%`;
}

export function formatPrice(n: number): string {
  if (!Number.isFinite(n)) return "—";
  const digits = n >= 1000 ? 2 : n >= 1 ? 4 : 6;
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: digits,
  });
}

export function formatInt(n: number): string {
  return n.toLocaleString("pt-BR");
}

export function formatWhen(ts: number): string {
  return new Date(ts).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

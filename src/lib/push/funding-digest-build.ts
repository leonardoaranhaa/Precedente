/**
 * Texto do digest de funding / OI — só fatos de mercado.
 * Sem direção de trade, sem “longo/curto recomendado”.
 */

export type FundingRow = {
  displayTicker: string;
  symbol: string;
  fundingRate: number | null;
  openInterest: number | null;
  markPrice: number | null;
  source: string | null;
};

export const FUNDING_DIGEST_DISCLAIMER =
  "Funding e open interest são contexto de posicionamento — não ordem de exposição.";

function fmtFunding(n: number): string {
  const pct = n * 100;
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(4).replace(".", ",")}%`;
}

function fmtOi(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(2).replace(".", ",")}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1).replace(".", ",")}K`;
  return n.toFixed(0);
}

function fmtMark(n: number): string {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: n < 1 ? 6 : 2 });
}

export function formatFundingDigestBody(rows: FundingRow[], maxLines = 8): string {
  const usable = rows.filter((r) => r.fundingRate != null || r.openInterest != null);
  const parts: string[] = [];
  if (usable.length === 0) {
    parts.push("Sem funding/OI listado nos pares da Watch neste ciclo.");
  } else {
    parts.push("Funding / OI (perp):");
    for (const r of usable.slice(0, maxLines)) {
      const bits: string[] = [`· ${r.displayTicker}`];
      if (r.fundingRate != null) bits.push(`f ${fmtFunding(r.fundingRate)}`);
      if (r.openInterest != null) bits.push(`OI ${fmtOi(r.openInterest)}`);
      if (r.markPrice != null) bits.push(`mark ${fmtMark(r.markPrice)}`);
      parts.push(bits.join(" · "));
    }
  }
  parts.push("");
  parts.push(FUNDING_DIGEST_DISCLAIMER);
  let body = parts.join("\n");
  if (body.length > 350) body = body.slice(0, 349).trimEnd() + "…";
  return body;
}

export function formatFundingDigestTitle(rows: FundingRow[]): string {
  const withF = rows.filter((r) => r.fundingRate != null).length;
  return withF > 0
    ? `Digest funding · ${withF} par(es)`
    : "Digest funding · sem dado listado";
}

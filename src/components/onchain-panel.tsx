import { ExternalLink, Layers } from "lucide-react";
import { formatInt, formatPct } from "@/lib/market/labels";
import type { OnchainContext } from "@/lib/market/types";
import { cn } from "@/lib/utils";

function formatUsd(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "—";
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

function formatFunding(rate: number | null): string {
  if (rate == null || !Number.isFinite(rate)) return "—";
  const pct = rate * 100;
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(4).replace(".", ",")}%`;
}

function formatOi(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return formatInt(Math.round(n));
}

function formatAge(hours: number | null): string {
  if (hours == null || !Number.isFinite(hours)) return "—";
  if (hours < 48) return `~${Math.round(hours)}h`;
  return `~${Math.round(hours / 24)}d`;
}

type Props = { onchain: OnchainContext | null };

/**
 * Painel factual de derivativos + liquidez DEX.
 * Descreve pressão de alavancagem e profundidade on-chain — sem ordem.
 *
 * Sempre renderiza: quando uma fonte falha (geo-block, par sem par DEX
 * claro, timeout), a seção explica o que falta em vez de sumir sem
 * legenda — sumir silenciosamente parece bug e esconde limitação real.
 */
export function OnchainPanel({ onchain }: Props) {
  const hasDeriv =
    onchain != null && (onchain.fundingRate != null || onchain.openInterest != null);
  const hasDex =
    onchain != null && (onchain.liquidityUsd != null || onchain.volume24hUsd != null);

  const fundingTone =
    onchain?.fundingRate == null
      ? undefined
      : Math.abs(onchain.fundingRate) >= 0.0005
        ? "warn"
        : undefined;

  const buys = onchain?.buys24h ?? 0;
  const sells = onchain?.sells24h ?? 0;
  const txnTotal = buys + sells;
  const sellShare = txnTotal > 0 ? (sells / txnTotal) * 100 : null;

  const buys6 = onchain?.buys6h ?? null;
  const sells6 = onchain?.sells6h ?? null;
  const txn6 =
    buys6 != null && sells6 != null ? buys6 + sells6 : null;
  const sellShare6 =
    txn6 != null && txn6 > 0 && sells6 != null ? (sells6 / txn6) * 100 : null;

  const youngPair =
    onchain?.pairAgeHours != null && onchain.pairAgeHours < 72;

  return (
    <section className="overflow-hidden rounded-xl bg-surface shadow-[var(--shadow-border)]">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Layers className="size-3.5 text-muted" />
          <h2 className="text-xs tracking-wide text-muted uppercase">
            Contexto on-chain
          </h2>
        </div>
        <span className="text-[11px] text-subtle">
          {onchain?.sources?.length ? onchain.sources.join(" · ") : "indisponível agora"}
        </span>
      </div>

      <div className="grid gap-0 sm:grid-cols-2">
        <div className="space-y-3 border-b border-border p-4 sm:border-b-0 sm:border-r">
          <p className="text-[10px] tracking-wide text-subtle uppercase">
            Derivativos perp
          </p>
          {hasDeriv && onchain ? (
            <>
              <dl className="space-y-2 text-sm">
                <Row
                  label="Funding"
                  value={formatFunding(onchain.fundingRate)}
                  tone={fundingTone}
                  hint="longs pagam shorts se positivo"
                />
                <Row label="Open interest" value={formatOi(onchain.openInterest)} />
                {onchain.markPrice != null ? (
                  <Row
                    label="Mark"
                    value={onchain.markPrice.toLocaleString("pt-BR", {
                      maximumFractionDigits: 4,
                    })}
                  />
                ) : null}
              </dl>
              <p className="text-[11px] leading-relaxed text-subtle">
                Funding extremo ou OI alto descrevem pressão de alavancagem no perp —
                não uma ordem de direção no spot.
              </p>
            </>
          ) : (
            <p className="text-[11px] leading-relaxed text-subtle">
              Funding e open interest indisponíveis agora — Binance Futures não
              respondeu nesta janela (rede/região ou instabilidade momentânea).
              Fingerprint e precedente não dependem disso.
            </p>
          )}
        </div>

        <div className="space-y-3 p-4">
          <p className="text-[10px] tracking-wide text-subtle uppercase">
            Liquidez DEX
            {onchain?.chainId ? ` · ${onchain.chainId}` : ""}
            {onchain?.dexId ? ` · ${onchain.dexId}` : ""}
          </p>
          {hasDex && onchain ? (
            <>
              <dl className="space-y-2 text-sm">
                <Row label="Liquidez" value={formatUsd(onchain.liquidityUsd)} />
                <Row label="Vol 24h" value={formatUsd(onchain.volume24hUsd)} />
                {onchain.volume6hUsd != null ? (
                  <Row label="Vol 6h" value={formatUsd(onchain.volume6hUsd)} />
                ) : null}
                {onchain.volume1hUsd != null ? (
                  <Row label="Vol 1h" value={formatUsd(onchain.volume1hUsd)} />
                ) : null}
                {onchain.priceChange24hPct != null ? (
                  <Row
                    label="Δ 24h"
                    value={formatPct(onchain.priceChange24hPct)}
                    tone={onchain.priceChange24hPct >= 0 ? "up" : "down"}
                  />
                ) : null}
                {onchain.priceChange6hPct != null ? (
                  <Row
                    label="Δ 6h"
                    value={formatPct(onchain.priceChange6hPct)}
                    tone={onchain.priceChange6hPct >= 0 ? "up" : "down"}
                  />
                ) : null}
                {onchain.priceChange1hPct != null ? (
                  <Row
                    label="Δ 1h"
                    value={formatPct(onchain.priceChange1hPct)}
                    tone={onchain.priceChange1hPct >= 0 ? "up" : "down"}
                  />
                ) : null}
                {sellShare != null ? (
                  <Row
                    label="Txns 24h"
                    value={`${formatInt(buys)}B / ${formatInt(sells)}S`}
                    hint={`${Math.round(sellShare)}% sells`}
                  />
                ) : null}
                {sellShare6 != null && buys6 != null && sells6 != null ? (
                  <Row
                    label="Txns 6h"
                    value={`${formatInt(buys6)}B / ${formatInt(sells6)}S`}
                    hint={`${Math.round(sellShare6)}% sells`}
                  />
                ) : null}
                {onchain.pairAgeHours != null ? (
                  <Row
                    label="Idade do par"
                    value={formatAge(onchain.pairAgeHours)}
                    tone={youngPair ? "warn" : undefined}
                    hint={youngPair ? "recente" : undefined}
                  />
                ) : null}
              </dl>
              {onchain.pairUrl ? (
                <a
                  href={onchain.pairUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-muted hover:text-fg"
                >
                  Abrir no DexScreener
                  <ExternalLink className="size-3" />
                </a>
              ) : null}
              <p className="text-[11px] leading-relaxed text-subtle">
                Vol/txns em 1h–6h e par muito novo aumentam o risco de escorregamento —
                contexto de fragilidade, não de entrada.
              </p>
            </>
          ) : (
            <p className="text-[11px] leading-relaxed text-subtle">
              Liquidez indisponível — nenhum par correspondente encontrado na
              DexScreener para este ativo agora.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function Row({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: string;
  tone?: "up" | "down" | "warn";
  hint?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="text-right">
        <span
          className={cn(
            "font-mono text-sm tabular-nums text-fg",
            tone === "up" && "text-up",
            tone === "down" && "text-down",
            tone === "warn" && "text-warn",
          )}
        >
          {value}
        </span>
        {hint ? (
          <span className="ml-1.5 text-[10px] text-subtle">{hint}</span>
        ) : null}
      </dd>
    </div>
  );
}

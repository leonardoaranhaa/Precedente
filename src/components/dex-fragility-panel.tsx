import { AlertTriangle, ExternalLink, Sprout } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
// SÓ type: `import type` é apagado na compilação, então isto NÃO cria um
// import estático de @/lib/market/dex em runtime. A fachada só pode ser
// alcançada por import() dinâmico (na rota) — misturar as duas formas corrompe
// o chunk do Rolldown. Ver docs/dex-arquitetura.md.
import type { DexFragilityReport, DexPairSnapshot, DexWindow } from "@/lib/market/dex";

const WINDOWS = [
  { key: "m5", label: "5M" },
  { key: "h1", label: "1H" },
  { key: "h6", label: "6H" },
  { key: "h24", label: "24H" },
] as const;

type WindowKey = (typeof WINDOWS)[number]["key"];

function usd(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "—";
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

/** Preço de token de ciclo curto costuma ter muitas casas — não arredondar pra zero. */
function price(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "—";
  if (n >= 1) return `$${n.toLocaleString("pt-BR", { maximumFractionDigits: 4 })}`;
  return `$${n.toPrecision(4)}`;
}

function pct(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const s = n >= 0 ? "+" : "";
  return `${s}${n.toFixed(2).replace(".", ",")}%`;
}

function age(hours: number | null): string {
  if (hours == null || !Number.isFinite(hours)) return "—";
  if (hours < 48) return `${Math.round(hours)}h`;
  return `${Math.round(hours / 24)}d`;
}

function count(n: number | null): string {
  return n == null ? "—" : n.toLocaleString("pt-BR");
}

const LEVEL_LABEL: Record<DexFragilityReport["level"], string> = {
  extrema: "Fragilidade extrema",
  alta: "Fragilidade alta",
  media: "Fragilidade média",
  observavel: "Sem sinal de fragilidade",
};

type Props = { pair: DexPairSnapshot; fragility: DexFragilityReport };

/**
 * Leitura de um token que vive no DEX. NÃO é a tela de precedente: um par de
 * horas não tem histórico de candles pra estatística de caminho. Aqui só entra
 * o estado do par agora — liquidez, fluxo e o que isso implica pra saída.
 */
export function DexFragilityPanel({ pair, fragility }: Props) {
  const [win, setWin] = useState<WindowKey>("h24");
  const w: DexWindow = pair[win];

  const total = (w.buys ?? 0) + (w.sells ?? 0);
  const buyShare = total > 0 ? ((w.buys ?? 0) / total) * 100 : null;

  const alta = fragility.level === "extrema" || fragility.level === "alta";
  const levelTone =
    fragility.level === "extrema"
      ? "text-down"
      : fragility.level === "alta" || fragility.level === "media"
        ? "text-warn"
        : "text-muted";

  return (
    <section className="overflow-hidden rounded-xl bg-surface shadow-[var(--shadow-border)]">
      {/* cabeçalho: identidade do par + veredito */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          {pair.imageUrl ? (
            <img
              src={pair.imageUrl}
              alt=""
              className="size-7 shrink-0 rounded-full bg-elevated object-cover"
              loading="lazy"
            />
          ) : null}
          <div className="min-w-0">
            <div className="flex items-baseline gap-1.5">
              <span className="truncate font-mono text-sm text-fg">
                {pair.tokenSymbol ?? "—"}
                {pair.quoteSymbol ? (
                  <span className="text-subtle">/{pair.quoteSymbol}</span>
                ) : null}
              </span>
              {pair.pairAgeHours != null ? (
                <span className="flex shrink-0 items-center gap-0.5 text-[11px] text-muted">
                  <Sprout className="size-3" />
                  {age(pair.pairAgeHours)}
                </span>
              ) : null}
            </div>
            <p className="truncate text-[11px] text-subtle">
              {[pair.tokenName, pair.chainId, pair.dexId, ...pair.labels]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={cn("flex items-center gap-1 text-xs", levelTone)}>
            {alta ? <AlertTriangle className="size-3.5" /> : null}
            {LEVEL_LABEL[fragility.level]}
          </span>
          {pair.pairUrl ? (
            <a
              href={pair.pairUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="text-subtle hover:text-fg"
              aria-label="Abrir par no DexScreener"
            >
              <ExternalLink className="size-3.5" />
            </a>
          ) : null}
        </div>
      </div>

      {/* números de estado */}
      <dl className="grid grid-cols-2 border-b border-border sm:grid-cols-4">
        <Cell label="Preço" value={price(pair.priceUsd)} />
        <Cell label="Liquidez" value={usd(pair.liquidityUsd)} />
        <Cell label="Market cap" value={usd(pair.marketCapUsd)} />
        <Cell
          label="Saída"
          value={
            fragility.metrics.liqToMcap == null
              ? "—"
              : `${(fragility.metrics.liqToMcap * 100).toFixed(fragility.metrics.liqToMcap < 0.01 ? 2 : 0).replace(".", ",")}%`
          }
          hint="liquidez ÷ mcap"
          tone={
            fragility.metrics.liqToMcap != null && fragility.metrics.liqToMcap < 0.05
              ? "warn"
              : undefined
          }
        />
      </dl>

      {/* janela de tempo: fluxo de compra e venda */}
      <div className="space-y-3 border-b border-border p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-1" role="tablist" aria-label="Janela de tempo">
            {WINDOWS.map((o) => (
              <button
                key={o.key}
                type="button"
                role="tab"
                aria-selected={win === o.key}
                onClick={() => setWin(o.key)}
                className={cn(
                  "rounded px-2 py-1 font-mono text-[11px] transition-colors",
                  win === o.key
                    ? "bg-elevated text-fg"
                    : "text-subtle hover:text-muted",
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
          <span
            className={cn(
              "font-mono text-sm tabular-nums",
              w.priceChangePct == null
                ? "text-muted"
                : w.priceChangePct >= 0
                  ? "text-up"
                  : "text-down",
            )}
          >
            {pct(w.priceChangePct)}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-[10px] tracking-wide text-subtle uppercase">Transações</p>
            <p className="font-mono text-sm tabular-nums text-fg">{count(total || null)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] tracking-wide text-subtle uppercase">Volume</p>
            <p className="font-mono text-sm tabular-nums text-fg">{usd(w.volumeUsd)}</p>
          </div>
        </div>

        {/* barra de pressão — só transações; a API pública não separa volume por lado */}
        {buyShare != null ? (
          <div className="space-y-1">
            <div className="flex justify-between font-mono text-[11px] tabular-nums">
              <span className="text-up">{count(w.buys)} compras</span>
              <span className="text-down">{count(w.sells)} vendas</span>
            </div>
            <div
              className="flex h-1.5 overflow-hidden rounded-full bg-elevated"
              role="img"
              aria-label={`${Math.round(buyShare)}% das transações foram compras`}
            >
              <div className="bg-up" style={{ width: `${buyShare}%` }} />
              <div className="flex-1 bg-down" />
            </div>
          </div>
        ) : null}
      </div>

      {/* sinais */}
      <div className="space-y-3 p-4">
        <p className="text-[10px] tracking-wide text-subtle uppercase">
          Sinais {fragility.flags.length > 0 ? `· ${fragility.flags.length}` : ""}
        </p>

        {fragility.flags.length > 0 ? (
          <ul className="space-y-2">
            {fragility.flags.map((f) => (
              <li key={f.id} className="flex gap-2">
                <span
                  className={cn(
                    "mt-1.5 size-1.5 shrink-0 rounded-full",
                    f.severity === "alta" ? "bg-down" : "bg-warn",
                  )}
                  aria-hidden
                />
                <p className="text-[11px] leading-relaxed text-muted">
                  <span className="text-fg">{f.label}</span> — {f.detail}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[11px] leading-relaxed text-subtle">
            Nenhum sinal de fragilidade nos limiares atuais: o par tem idade,
            profundidade e fluxo dentro do esperado. Não é aval — é ausência de
            alerta.
          </p>
        )}

        <p className="border-t border-border pt-3 text-[11px] leading-relaxed text-subtle">
          {fragility.disclaimer}
        </p>
      </div>
    </section>
  );
}

function Cell({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "warn";
}) {
  return (
    <div className="border-b border-border p-3 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0 [&:nth-child(2)]:border-r-0 sm:[&:nth-child(2)]:border-r">
      <dt className="text-[10px] tracking-wide text-subtle uppercase">{label}</dt>
      <dd
        className={cn(
          "mt-0.5 font-mono text-sm tabular-nums text-fg",
          tone === "warn" && "text-warn",
        )}
      >
        {value}
        {hint ? <span className="ml-1 text-[10px] text-subtle">{hint}</span> : null}
      </dd>
    </div>
  );
}

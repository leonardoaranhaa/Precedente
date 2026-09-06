import { useState } from "react";
import { ExternalLink, Globe, Loader2, Search, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type IntelSource = { url: string; title: string };

type IntelResult = {
  ticker: string;
  displayTicker: string;
  summary: string;
  sources: IntelSource[];
  searchCount: number;
  costUsd: number;
  fetchedAt: number;
};

export function IntelPanel({
  ticker,
  className,
}: {
  ticker: string;
  className?: string;
}) {
  const [intel, setIntel] = useState<IntelResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/intel?ticker=${encodeURIComponent(ticker)}`);
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          body && typeof body === "object" && "error" in body
            ? (body as { error: string }).error
            : `Erro ao buscar contexto (status ${res.status}).`,
        );
      }
      setIntel((await res.json()) as IntelResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao buscar contexto.");
    } finally {
      setLoading(false);
    }
  };

  if (!intel && !loading && !error) {
    return (
      <section
        className={cn(
          "rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]",
          className,
        )}
        aria-label="Inteligência de mercado"
      >
        <div className="flex items-start gap-2">
          <Globe className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-medium text-fg">
              Inteligência de Mercado
            </h3>
            <p className="mt-1 text-xs text-muted leading-relaxed">
              Agente AI busca notícias, eventos e contexto de mercado em tempo
              real para {ticker}.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="mt-3 gap-1.5"
          onClick={load}
        >
          <Search className="size-3.5" />
          Buscar contexto
        </Button>
      </section>
    );
  }

  if (loading) {
    return (
      <section
        className={cn(
          "rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]",
          className,
        )}
      >
        <div className="flex items-start gap-2">
          <Globe className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
          <h3 className="text-sm font-medium text-fg">
            Inteligência de Mercado
          </h3>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Loader2 className="size-4 animate-spin text-muted" />
          <span className="text-xs text-muted">
            Buscando notícias e contexto para {ticker}...
          </span>
        </div>
        <p className="mt-2 text-[11px] italic text-subtle">
          O agente pesquisa fontes reais na web. Pode levar até 30s.
        </p>
      </section>
    );
  }

  if (error) {
    return (
      <section
        className={cn(
          "rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]",
          className,
        )}
      >
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warn" aria-hidden />
          <h3 className="text-sm font-medium text-fg">
            Inteligência de Mercado
          </h3>
        </div>
        <p className="mt-2 text-xs text-warn">{error}</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={load}
        >
          Tentar novamente
        </Button>
      </section>
    );
  }

  if (!intel) return null;

  const ago = Math.round((Date.now() - intel.fetchedAt) / 60000);
  const agoLabel = ago < 1 ? "agora" : `${ago}min atrás`;

  return (
    <section
      className={cn(
        "rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]",
        className,
      )}
      aria-label="Inteligência de mercado"
    >
      <div className="flex items-start gap-2">
        <Globe className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-medium text-fg">
            Inteligência · {intel.displayTicker}
          </h3>
        </div>
        <span className="shrink-0 text-[11px] tabular-nums text-subtle">
          {agoLabel}
        </span>
      </div>

      <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-fg">
        {intel.summary}
      </p>

      {intel.sources.length > 0 && (
        <div className="mt-3 space-y-1">
          <h4 className="text-[11px] uppercase tracking-wider text-subtle">
            Fontes
          </h4>
          {intel.sources.map((src) => (
            <a
              key={src.url}
              href={src.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 py-0.5 text-xs text-accent hover:underline"
            >
              <ExternalLink className="size-3 shrink-0 text-subtle" />
              <span className="min-w-0 truncate">{src.title}</span>
            </a>
          ))}
        </div>
      )}

      <p className="mt-3 text-[11px] italic text-subtle leading-snug">
        Contexto informativo gerado por AI com busca web real (
        {intel.searchCount} {intel.searchCount === 1 ? "busca" : "buscas"}).
        Não é recomendação de investimento.
      </p>

      <Button
        variant="ghost"
        size="sm"
        className="mt-2 gap-1.5 text-xs"
        onClick={load}
      >
        <Search className="size-3" />
        Atualizar
      </Button>
    </section>
  );
}

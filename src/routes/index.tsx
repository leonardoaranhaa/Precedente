import { useEffect, useState, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { HelpCircle, Search } from "lucide-react";
import { AnalyzeForm } from "@/components/analyze-form";
import { AnalysisResult } from "@/components/analysis-result";
import { HistoryPanel } from "@/components/history-panel";
import { HowItWorks } from "@/components/how-it-works";
import { Mark } from "@/components/mark";
import { Pipeline, type PipelineStep } from "@/components/pipeline";
import { ScenarioAssistant } from "@/components/scenario-assistant";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { WatchPanel } from "@/components/watch-panel";
import { analyzeSetup } from "@/lib/analyze";
import { productBoundary } from "@/lib/market/sample-copy";
import { makeThumb } from "@/lib/compress";
import { loadHistory, pushHistory } from "@/lib/history";
import type { StoredAnalysis, Timeframe } from "@/lib/market/types";
import {
  isWatched,
  loadWatchlist,
  removeWatch,
  upsertWatch,
  type WatchItem,
} from "@/lib/watchlist";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({ component: Home });

type View = "home" | "history" | "result" | "watch";

function Home() {
  const [view, setView] = useState<View>("home");
  const [ticker, setTicker] = useState("BTC");
  const [timeframe, setTimeframe] = useState<Timeframe>("4h");
  const [image, setImage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<PipelineStep>("ohlc");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<StoredAnalysis | null>(null);
  const [history, setHistory] = useState<StoredAnalysis[]>([]);
  const [watch, setWatch] = useState<WatchItem[]>([]);
  const [focusIds, setFocusIds] = useState<string[]>([]);
  const [topTraded, setTopTraded] = useState<string[]>([]);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [refreshingAll, setRefreshingAll] = useState(false);
  const [watchError, setWatchError] = useState<string | null>(null);

  useEffect(() => {
    setHistory(loadHistory());
    setWatch(loadWatchlist());
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/universe?limit=12", { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("universe"))))
      .then((body: { pairs?: { base: string }[] }) => {
        setTopTraded((body.pairs ?? []).map((p) => p.base));
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  async function run() {
    setError(null);
    setBusy(true);
    setStep("ohlc");
    const t1 = window.setTimeout(() => setStep("stats"), 600);
    const t2 = window.setTimeout(() => setStep(image ? "vision" : "stats"), 1400);
    try {
      const payload = await analyzeSetup({
        data: {
          ticker,
          timeframe,
          imageDataUrl: image,
        },
      });
      const thumb = image ? await makeThumb(image) : null;
      const stored: StoredAnalysis = {
        ...payload,
        id: crypto.randomUUID(),
        createdAt: Date.now(),
        hasImage: Boolean(image),
        thumb,
      };
      setResult(stored);
      setHistory((h) => pushHistory(h, stored));
      setWatch((w) => (isWatched(w, stored) ? upsertWatch(w, stored) : w));
      touchFocus(`${stored.ticker}:${stored.timeframe}`);
      setStep("done");
      setView("result");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Não foi possível concluir a análise.";
      setError(cleanError(message));
    } finally {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      setBusy(false);
    }
  }

  function touchFocus(id: string) {
    setFocusIds((current) => [id, ...current.filter((x) => x !== id)].slice(0, 8));
  }

  function toggleWatch(analysis: StoredAnalysis) {
    setWatch((current) => {
      if (isWatched(current, analysis)) {
        return removeWatch(current, `${analysis.ticker}:${analysis.timeframe}`);
      }
      return upsertWatch(current, analysis);
    });
  }

  async function refreshWatchItem(
    item: WatchItem,
    opts?: { openResult?: boolean; silent?: boolean },
  ): Promise<StoredAnalysis | null> {
    if (!opts?.silent) {
      setWatchError(null);
      setRefreshingId(item.id);
    }
    try {
      const payload = await analyzeSetup({
        data: {
          ticker: item.ticker,
          timeframe: item.timeframe,
          imageDataUrl: null,
        },
      });
      const stored: StoredAnalysis = {
        ...payload,
        id: crypto.randomUUID(),
        createdAt: Date.now(),
        hasImage: false,
        thumb: null,
      };
      setHistory((h) => pushHistory(h, stored));
      setWatch((w) => upsertWatch(w, stored));
      if (opts?.openResult) {
        setResult(stored);
        setView("result");
      }
      return stored;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha ao reavaliar este par.";
      if (!opts?.silent) setWatchError(cleanError(message));
      return null;
    } finally {
      if (!opts?.silent) setRefreshingId(null);
    }
  }

  async function refreshAllWatch() {
    if (watch.length === 0 || refreshingAll) return;
    setWatchError(null);
    setRefreshingAll(true);
    const list = [...watch];
    let failed = 0;
    for (const item of list) {
      const ok = await refreshWatchItem(item, { silent: true });
      if (!ok) failed += 1;
    }
    setRefreshingAll(false);
    if (failed > 0) {
      setWatchError(
        failed === list.length
          ? "Não foi possível reavaliar nenhum par. Confira a rede."
          : `${failed} par(es) falharam na reavaliação.`,
      );
    }
  }

  function openFromWatch(item: WatchItem) {
    touchFocus(item.id);
    const fromHistory = history.find(
      (h) => h.ticker === item.ticker && h.timeframe === item.timeframe,
    );
    if (fromHistory) {
      setResult(fromHistory);
      setView("result");
      return;
    }
    void refreshWatchItem(item, { openResult: true });
  }

  const wide = view === "result" || view === "home";
  const resultWatched = result ? isWatched(watch, result) : false;

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <div
        className={cn(
          "mx-auto flex w-full flex-col px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]",
          view === "result" ? "max-w-6xl" : wide ? "max-w-5xl" : "max-w-lg",
          // Acima de xl a watch vira coluna permanente (layout terminal) —
          // precisa de mais largura que qualquer um dos limites acima.
          "xl:max-w-[1680px]",
        )}
      >
        <header className="flex flex-wrap items-center justify-between gap-3 py-2">
          <button
            type="button"
            className="flex items-center gap-2 text-fg"
            onClick={() => {
              setView("home");
              setError(null);
            }}
          >
            <Mark className="size-7" />
            <span className="font-display text-xl tracking-tight">Precedente</span>
          </button>
          <div className="flex flex-wrap items-center gap-2">
            <form
              className="hidden items-center gap-1.5 rounded-md bg-surface px-2.5 shadow-[var(--shadow-border)] sm:flex"
              onSubmit={(e) => {
                e.preventDefault();
                if (busy || !ticker.trim()) return;
                setView("home");
                void run();
              }}
            >
              <Search className="size-3.5 shrink-0 text-subtle" />
              <input
                value={ticker}
                onChange={(e) => setTicker(e.target.value)}
                placeholder="BTC, ETHUSDT…"
                disabled={busy}
                className="h-9 w-32 bg-transparent font-mono text-xs uppercase text-fg placeholder:text-subtle placeholder:normal-case focus:outline-none disabled:opacity-50"
              />
            </form>

            <nav className="flex flex-wrap rounded-md bg-surface p-1 shadow-[var(--shadow-border)]">
              <Tab active={view === "home"} onClick={() => setView("home")}>
                Analisar
              </Tab>
              {/* Acima de xl a watch é uma coluna sempre visível (ver grid
                  abaixo) — a aba fica redundante e some. */}
              <Tab active={view === "watch"} onClick={() => setView("watch")} className="xl:hidden">
                Watch
              </Tab>
              <Tab active={view === "history"} onClick={() => setView("history")}>
                Histórico
              </Tab>
            </nav>

            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label="Como ler"
                  className="flex size-9 items-center justify-center rounded-md bg-surface text-muted shadow-[var(--shadow-border)] hover:text-fg"
                >
                  <HelpCircle className="size-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent>
                <p className="text-xs tracking-wide text-muted uppercase">Como ler</p>
                <ul className="mt-3 space-y-3 text-sm leading-relaxed text-fg">
                  <li>
                    <span className="font-medium">Amostra</span> — quantos casos parecidos já
                    aconteceram no histórico real. Poucos casos, leia como ilustração.
                  </li>
                  <li>
                    <span className="font-medium">Horizonte</span> — o que o preço fez depois, em
                    5/10/20 barras à frente: subiu, ficou lateral ou caiu, e a mediana do retorno.
                  </li>
                  <li>
                    <span className="font-medium">Caminho (drawdown)</span> — o quanto o preço
                    balançou contra antes de chegar no fim do horizonte. É o caminho que estressa
                    quem opera alavancado, não só o ponto final.
                  </li>
                </ul>
                <p className="mt-3 text-xs leading-relaxed text-subtle">{productBoundary()}</p>
              </PopoverContent>
            </Popover>
          </div>
        </header>

        <div className="xl:grid xl:grid-cols-[300px_minmax(0,1fr)] xl:items-start xl:gap-6">
          {/* Rail permanente: acima de xl a watch fica sempre visível ao
              lado do que estiver no centro, em vez de trocar de aba pra
              vê-la (layout terminal do wireframe). */}
          <div className="hidden xl:block xl:pt-6">
            <WatchPanel
              items={watch}
              focusIds={focusIds}
              activeId={result ? `${result.ticker}:${result.timeframe}` : null}
              refreshingId={refreshingId}
              refreshingAll={refreshingAll}
              error={watchError}
              onSelect={openFromWatch}
              onRemove={(id) => setWatch((w) => removeWatch(w, id))}
              onRefresh={(item) => void refreshWatchItem(item, { openResult: true })}
              onRefreshAll={() => void refreshAllWatch()}
            />
          </div>

          <div>
            {view === "result" && result ? (
              <div className="mt-4">
                <AnalysisResult
                  analysis={result}
                  onBack={() => {
                    setView("home");
                  }}
                  watched={resultWatched}
                  onToggleWatch={() => toggleWatch(result)}
                />
              </div>
            ) : view === "watch" ? (
              <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] lg:items-start">
                <div>
                  <h1 className="font-display text-3xl tracking-tight">Watch</h1>
                  <p className="mt-1 mb-6 text-sm text-muted">
                    Pares pinados neste aparelho — amostra e drawdown, sem conta.
                  </p>
                  <WatchPanel
                    items={watch}
                    focusIds={focusIds}
                    activeId={result ? `${result.ticker}:${result.timeframe}` : null}
                    refreshingId={refreshingId}
                    refreshingAll={refreshingAll}
                    error={watchError}
                    onSelect={openFromWatch}
                    onRemove={(id) => setWatch((w) => removeWatch(w, id))}
                    onRefresh={(item) => void refreshWatchItem(item, { openResult: true })}
                    onRefreshAll={() => void refreshAllWatch()}
                  />
                </div>
                <div className="hidden rounded-xl bg-surface p-5 text-sm leading-relaxed text-muted shadow-[var(--shadow-border)] lg:block">
                  <p className="text-xs tracking-wide text-muted uppercase">Como usar</p>
                  <ul className="mt-3 list-disc space-y-2 pl-4">
                    <li>
                      Analise um par e toque em <span className="text-fg">+ Watch</span>.
                    </li>
                    <li>
                      <span className="text-fg">Reavaliar</span> chama a API de novo (OHLC fresco,
                      sem print) e atualiza amostra e drawdown.
                    </li>
                    <li>Clique na linha para abrir o último snapshot do histórico.</li>
                    <li>Nada aqui é ordem de compra ou venda — só contexto de risco.</li>
                  </ul>
                </div>
              </div>
            ) : view === "history" ? (
              <div className="mt-6">
                <h1 className="font-display text-3xl tracking-tight">Histórico</h1>
                <p className="mt-1 mb-6 text-sm text-muted">Neste aparelho, sem conta.</p>
                <HistoryPanel
                  items={history}
                  onOpen={(item) => {
                    setResult(item);
                    setView("result");
                  }}
                />
              </div>
            ) : (
              <div className="mt-6 grid gap-10 lg:mt-10 lg:grid-cols-2 lg:items-start lg:gap-16">
                <div className="space-y-8">
                  <div className="space-y-3">
                    <p className="text-xs tracking-wide text-muted uppercase">
                      OHLC real · padrões históricos · nunca compre/venda
                    </p>
                    <h1 className="font-display text-4xl leading-tight tracking-tight text-fg">
                      Quantas vezes isso já aconteceu?
                    </h1>
                    <p className="max-w-md text-base leading-relaxed text-muted">
                      A estatística vem do histórico real: RSI, médias e o que o preço fez depois.
                      No resultado, o assistente de cenário descreve o padrão — sem ordenar
                      exposição.
                    </p>
                  </div>

                  {busy ? (
                    <Pipeline step={step} hasImage={Boolean(image)} />
                  ) : (
                    <AnalyzeForm
                      ticker={ticker}
                      timeframe={timeframe}
                      image={image}
                      busy={busy}
                      error={error}
                      topTraded={topTraded}
                      onTicker={setTicker}
                      onTimeframe={setTimeframe}
                      onImage={setImage}
                      onSubmit={() => void run()}
                    />
                  )}
                </div>

                <div className={cn("space-y-6", busy && "opacity-50")}>
                  {/* Abaixo de xl não há rail — mantém o atalho de Watch aqui.
                  Acima de xl a watch já está sempre visível à esquerda,
                  então esse espaço vira só "como funciona". */}
                  <div className="xl:hidden">
                    {watch.length > 0 ? (
                      <WatchPanel
                        items={watch.slice(0, 6)}
                        onSelect={openFromWatch}
                        onRemove={(id) => setWatch((w) => removeWatch(w, id))}
                        onRefresh={(item) => void refreshWatchItem(item, { openResult: true })}
                      />
                    ) : (
                      <HowItWorks />
                    )}
                  </div>
                  <div className="hidden xl:block">
                    <HowItWorks />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Assistente flutuante: disponível sempre que houver um resultado carregado */}
      {result ? <ScenarioAssistant analysis={result} /> : null}
    </div>
  );
}

function Tab({
  active,
  onClick,
  children,
  className,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-9 rounded-sm px-3 text-xs font-medium",
        active ? "bg-bg-elevated text-fg shadow-[var(--shadow-border)]" : "text-muted",
        className,
      )}
    >
      {children}
    </button>
  );
}

function cleanError(message: string): string {
  if (message.includes("Failed to fetch") || message.includes("NetworkError")) {
    return "Falha de rede. Tente de novo.";
  }
  return message.replace(/^Error:\s*/, "");
}

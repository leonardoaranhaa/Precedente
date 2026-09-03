import { useEffect, useRef, useState, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { HelpCircle, Search } from "lucide-react";
import { AnalyzeForm } from "@/components/analyze-form";
import { AccountMenu } from "@/components/account-menu";
import { SettingsModal } from "@/components/settings-modal";
import { AnalysisResult } from "@/components/analysis-result";
import { HistoryPanel } from "@/components/history-panel";
import { HowItWorks } from "@/components/how-it-works";
import { Mark } from "@/components/mark";
import { Pipeline, type PipelineStep } from "@/components/pipeline";
import { RiskLogPanel } from "@/components/risk-log-panel";
import { ScenarioAssistant } from "@/components/scenario-assistant";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { WatchPanel } from "@/components/watch-panel";
import { analyzeSetup } from "@/lib/analyze";
import { productBoundary } from "@/lib/market/sample-copy";
import { makeThumb } from "@/lib/compress";
import { loadHistory, pushHistory, saveHistory } from "@/lib/history";
import {
  TIMEFRAME_GROUPS,
  type StoredAnalysis,
  type Timeframe,
  type WatchRefreshMinutes,
} from "@/lib/market/types";
import { loadWatchRefreshMinutes, saveWatchRefreshMinutes } from "@/lib/watch-refresh";
import {
  isWatched,
  loadWatchlist,
  removeWatch,
  saveWatchlist,
  upsertWatch,
  type WatchItem,
} from "@/lib/watchlist";
import { cn } from "@/lib/utils";
import { getSyncData, setSyncData } from "@/lib/sync";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/")({ component: Home });

type View = "home" | "history" | "result" | "watch";

// Espera de inatividade antes de sincronizar watch/history com o servidor —
// absorve rajadas de mudanças (ex.: "Reavaliar todos") numa única escrita.
const SYNC_DEBOUNCE_MS = 1500;

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
  const [autoRefreshMin, setAutoRefreshMin] = useState<WatchRefreshMinutes>(0);

  const watchRef = useRef(watch);
  const refreshingAllRef = useRef(refreshingAll);
  const refreshAllFnRef = useRef<() => void>(() => {});
  watchRef.current = watch;
  refreshingAllRef.current = refreshingAll;

  useEffect(() => {
    setHistory(loadHistory());
    setWatch(loadWatchlist());
    setAutoRefreshMin(loadWatchRefreshMinutes());
  }, []);

  // Sincronização opcional: só entra em ação com login. Sem conta, tudo
  // continua 100% local, exatamente como antes — nenhuma chamada extra.
  const { user } = useCurrentUserState();
  const syncedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user || syncedUserIdRef.current === user.id) return;
    const userId = user.id;
    let cancelled = false;
    (async () => {
      const [serverWatch, serverHistory] = await Promise.all([
        getSyncData({ data: "watch" }).catch(() => null),
        getSyncData({ data: "history" }).catch(() => null),
      ]);
      if (cancelled) return;
      if (serverWatch == null && serverHistory == null) {
        // Primeiro login: sobe o que já existe só neste aparelho.
        void setSyncData({ data: { kind: "watch", data: watchRef.current } }).catch(() => {});
        void setSyncData({ data: { kind: "history", data: history } }).catch(() => {});
      } else {
        // Já sincronizou antes (neste ou noutro aparelho): a conta manda.
        const nextWatch = (serverWatch as WatchItem[] | null) ?? [];
        const nextHistory = (serverHistory as StoredAnalysis[] | null) ?? [];
        setWatch(nextWatch);
        setHistory(nextHistory);
        saveWatchlist(nextWatch);
        saveHistory(nextHistory);
      }
      syncedUserIdRef.current = userId;
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só dispara na transição de login, não a cada mudança de watch/history
  }, [user?.id]);

  // Debounced: watch/history mudam em rajada (ex.: "Reavaliar todos" atualiza
  // item por item), e cada mutação reescreve o blob inteiro no Postgres — sem
  // isso, uma rajada de N mudanças em poucos segundos vira N escritas.
  useEffect(() => {
    if (!user || syncedUserIdRef.current !== user.id) return;
    const id = window.setTimeout(() => {
      void setSyncData({ data: { kind: "watch", data: watch } }).catch(() => {});
    }, SYNC_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [user, watch]);

  useEffect(() => {
    if (!user || syncedUserIdRef.current !== user.id) return;
    const id = window.setTimeout(() => {
      void setSyncData({ data: { kind: "history", data: history } }).catch(() => {});
    }, SYNC_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [user, history]);

  useEffect(() => {
    if (autoRefreshMin <= 0) return;
    const ms = autoRefreshMin * 60_000;
    const id = window.setInterval(() => {
      if (refreshingAllRef.current || watchRef.current.length === 0) return;
      refreshAllFnRef.current();
    }, ms);
    return () => window.clearInterval(id);
  }, [autoRefreshMin]);

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

  async function changeGlobalTimeframe(tf: Timeframe) {
    setTimeframe(tf);
    if (view !== "result" || !result) return;
    if (tf === result.timeframe) return;

    const target = result.ticker;
    setError(null);
    setBusy(true);
    setStep("ohlc");
    const t1 = window.setTimeout(() => setStep("stats"), 600);
    try {
      const payload = await analyzeSetup({
        data: { ticker: target, timeframe: tf, imageDataUrl: null },
      });
      const stored: StoredAnalysis = {
        ...payload,
        id: crypto.randomUUID(),
        createdAt: Date.now(),
        hasImage: false,
        thumb: null,
      };
      setResult(stored);
      setHistory((h) => pushHistory(h, stored));
      setWatch((w) => (isWatched(w, stored) ? upsertWatch(w, stored) : w));
      touchFocus(`${stored.ticker}:${stored.timeframe}`);
      setStep("done");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Não foi possível concluir a análise.";
      setError(cleanError(message));
    } finally {
      window.clearTimeout(t1);
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
    opts?: { openResult?: boolean; silent?: boolean; showProgress?: boolean },
  ): Promise<StoredAnalysis | null> {
    if (!opts?.silent) setWatchError(null);
    if (!opts?.silent || opts?.showProgress) setRefreshingId(item.id);
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
        setTicker(stored.displayTicker.split("/")[0] ?? stored.ticker);
        setTimeframe(stored.timeframe);
        setView("result");
      }
      return stored;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha ao reavaliar este par.";
      if (!opts?.silent) setWatchError(cleanError(message));
      return null;
    } finally {
      if (!opts?.silent || opts?.showProgress) setRefreshingId(null);
    }
  }

  async function refreshAllWatch() {
    if (watchRef.current.length === 0 || refreshingAllRef.current) return;
    setWatchError(null);
    setRefreshingAll(true);
    const list = [...watchRef.current];
    const failedTickers: string[] = [];
    for (const item of list) {
      const ok = await refreshWatchItem(item, { silent: true, showProgress: true });
      if (!ok) failedTickers.push(item.displayTicker);
    }
    setRefreshingAll(false);
    if (failedTickers.length > 0) {
      setWatchError(
        failedTickers.length === list.length
          ? "Não foi possível reavaliar nenhum par. Confira a rede."
          : `Falha ao reavaliar: ${failedTickers.join(", ")}.`,
      );
    }
  }

  refreshAllFnRef.current = () => {
    void refreshAllWatch();
  };

  function setAutoRefresh(v: WatchRefreshMinutes) {
    setAutoRefreshMin(v);
    saveWatchRefreshMinutes(v);
  }

  function openFromWatch(item: WatchItem) {
    touchFocus(item.id);
    const fromHistory = history.find(
      (h) => h.ticker === item.ticker && h.timeframe === item.timeframe,
    );
    if (fromHistory) {
      setResult(fromHistory);
      setTicker(fromHistory.displayTicker.split("/")[0] ?? fromHistory.ticker);
      setTimeframe(fromHistory.timeframe);
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

            <div
              className="hidden items-center gap-0.5 rounded-md bg-surface p-1 shadow-[var(--shadow-border)] font-mono sm:flex"
              role="group"
              aria-label="Tempo gráfico"
            >
              {TIMEFRAME_GROUPS.map((group, gi) => (
                <div key={group.key} className="flex items-center gap-0.5">
                  {gi > 0 ? <span className="mx-0.5 h-4 w-px bg-border" aria-hidden /> : null}
                  {group.tfs.map((tf) => (
                    <button
                      key={tf}
                      type="button"
                      disabled={busy}
                      onClick={() => void changeGlobalTimeframe(tf)}
                      title={`${group.label} · trocar para ${tf}${view === "result" && result ? ` — reanalisa ${result.displayTicker}` : ""}`}
                      className={cn(
                        "h-7 rounded-sm px-1.5 text-[10px] font-medium disabled:opacity-50",
                        tf === timeframe ? "bg-accent text-accent-fg" : "text-muted hover:text-fg",
                      )}
                    >
                      {tf}
                    </button>
                  ))}
                </div>
              ))}
            </div>

            <nav className="flex flex-wrap rounded-md bg-surface p-1 shadow-[var(--shadow-border)]">
              <Tab active={view === "home"} onClick={() => setView("home")}>
                Analisar
              </Tab>
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

            <SettingsModal />

            <AccountMenu />
          </div>
        </header>

        <div className="xl:grid xl:grid-cols-[300px_minmax(0,1fr)] xl:items-start xl:gap-6">
          <div className="hidden xl:sticky xl:top-4 xl:block xl:pt-6">
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
              autoRefreshMin={autoRefreshMin}
              onAutoRefreshMin={setAutoRefresh}
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
                  onChangeTimeframe={(tf) => void changeGlobalTimeframe(tf)}
                  reanalyzing={busy && view === "result"}
                  reanalyzeError={view === "result" ? error : null}
                />
              </div>
            ) : view === "watch" ? (
              <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] lg:items-start">
                <div>
                  <h1 className="font-display text-3xl tracking-tight">Watch</h1>
                  <p className="mt-1 mb-6 text-sm text-muted">
                    {user
                      ? "Pares pinados — sincronizados na sua conta entre aparelhos."
                      : "Pares pinados neste aparelho — amostra e drawdown, sem conta."}
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
                    autoRefreshMin={autoRefreshMin}
                    onAutoRefreshMin={setAutoRefresh}
                  />
                </div>
                <div className="hidden rounded-xl bg-surface p-5 text-sm leading-relaxed text-muted shadow-[var(--shadow-border)] lg:block">
                  <p className="text-xs tracking-wide text-muted uppercase">Como usar</p>
                  <ul className="mt-3 list-disc space-y-2 pl-4">
                    <li>
                      Analise um par e toque em <span className="text-fg">+ Watch</span>.
                    </li>
                    <li>
                      <span className="text-fg">Reavaliar</span> ou auto 1/5/15 min: snapshot fresco
                      (não é websocket ao vivo).
                    </li>
                    <li>Clique na linha para abrir o último snapshot do histórico.</li>
                    <li>Nada aqui é ordem de compra ou venda — só contexto de risco.</li>
                  </ul>
                </div>
              </div>
            ) : view === "history" ? (
              <div className="mt-6">
                <h1 className="font-display text-3xl tracking-tight">Histórico</h1>
                <p className="mt-1 mb-6 text-sm text-muted">
                  {user ? "Sincronizado na sua conta entre aparelhos." : "Neste aparelho, sem conta."}
                </p>
                <HistoryPanel
                  items={history}
                  synced={Boolean(user)}
                  onOpen={(item) => {
                    setResult(item);
                    setTicker(item.displayTicker.split("/")[0] ?? item.ticker);
                    setTimeframe(item.timeframe);
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

                  <RiskLogPanel />

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

      <footer className="mx-auto max-w-6xl px-4 pb-6 text-center text-[11px] text-subtle xl:max-w-[1680px]">
        <Link to="/termos" className="underline-offset-4 hover:text-fg hover:underline">
          Termos
        </Link>
        {" · "}
        <Link to="/privacidade" className="underline-offset-4 hover:text-fg hover:underline">
          Privacidade
        </Link>
        {" · "}
        <Link to="/aviso-de-risco" className="underline-offset-4 hover:text-fg hover:underline">
          Aviso de risco
        </Link>
      </footer>

      {view === "result" && result ? <ScenarioAssistant analysis={result} /> : null}
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

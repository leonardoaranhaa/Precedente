import { useEffect, useState, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AnalyzeForm } from "@/components/analyze-form";
import { AnalysisResult } from "@/components/analysis-result";
import { HistoryPanel } from "@/components/history-panel";
import { HowItWorks } from "@/components/how-it-works";
import { Mark } from "@/components/mark";
import { Pipeline, type PipelineStep } from "@/components/pipeline";
import { analyzeSetup } from "@/lib/analyze";
import { makeThumb } from "@/lib/compress";
import { loadHistory, pushHistory } from "@/lib/history";
import type { StoredAnalysis, Timeframe } from "@/lib/market/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({ component: Home });

type View = "home" | "history" | "result";

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

  useEffect(() => {
    setHistory(loadHistory());
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
      setStep("done");
      setView("result");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Não foi possível concluir a análise.";
      setError(cleanError(message));
    } finally {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      setBusy(false);
    }
  }

  const wide = view !== "history";

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <div
        className={cn(
          "mx-auto flex w-full flex-col px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]",
          wide ? "max-w-5xl" : "max-w-lg",
        )}
      >
        <header className="flex items-center justify-between gap-3 py-2">
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
          <nav className="flex rounded-md bg-surface p-1 shadow-[var(--shadow-border)]">
            <Tab active={view === "home"} onClick={() => setView("home")}>
              Analisar
            </Tab>
            <Tab active={view === "history"} onClick={() => setView("history")}>
              Histórico
            </Tab>
          </nav>
        </header>

        {view === "result" && result ? (
          <div className="mt-4">
            <AnalysisResult
              analysis={result}
              onBack={() => {
                setView("home");
              }}
            />
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
                  Print + ticker · nunca compre/venda
                </p>
                <h1 className="font-display text-4xl leading-tight tracking-tight text-fg">
                  Quantas vezes isso já aconteceu?
                </h1>
                <p className="max-w-md text-base leading-relaxed text-muted">
                  O print descreve o que se vê. A estatística vem do OHLC real:
                  RSI, médias, e o que o preço fez depois das vezes anteriores.
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
                  onTicker={setTicker}
                  onTimeframe={setTimeframe}
                  onImage={setImage}
                  onSubmit={() => void run()}
                />
              )}
            </div>

            <div className={cn(busy && "opacity-50")}>
              <HowItWorks />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Tab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-9 rounded-sm px-3 text-xs font-medium",
        active ? "bg-bg-elevated text-fg shadow-[var(--shadow-border)]" : "text-muted",
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

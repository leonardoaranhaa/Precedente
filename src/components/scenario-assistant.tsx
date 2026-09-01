import { useEffect, useMemo, useState } from "react";
import { MessageCircle, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ASSISTANT_QUESTIONS,
  answerAssistantQuestion,
  type AssistantQuestionId,
} from "@/lib/market/assistant-qa";
import { narrateScenario } from "@/lib/market/narrate";
import type { StoredAnalysis } from "@/lib/market/types";
import { cn } from "@/lib/utils";

type Props = {
  analysis: StoredAnalysis | null;
  className?: string;
  preferOpen?: boolean;
};

export function ScenarioAssistant({ analysis, className, preferOpen = false }: Props) {
  const [open, setOpen] = useState(preferOpen);
  const [hint, setHint] = useState(true);
  const [qaId, setQaId] = useState<AssistantQuestionId | null>(null);

  const narrative = useMemo(
    () => (analysis ? narrateScenario(analysis) : null),
    [analysis],
  );

  const qaAnswer = useMemo(() => {
    if (!analysis || !qaId) return null;
    return answerAssistantQuestion(analysis, qaId);
  }, [analysis, qaId]);

  useEffect(() => {
    if (!analysis) return;
    setHint(true);
    setQaId(null);
    if (preferOpen) setOpen(true);
  }, [analysis?.id, preferOpen]);

  if (!analysis || !narrative) return null;

  const weak = analysis.precedent.sampleNote !== "ok";

  return (
    <div
      className={cn(
        "fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] z-40 flex flex-col items-end gap-2",
        className,
      )}
    >
      {open ? (
        <section
          className="flex max-h-[min(70vh,520px)] w-[min(100vw-2rem,380px)] flex-col overflow-hidden rounded-2xl bg-surface shadow-[var(--shadow-border)] ring-1 ring-border"
          role="dialog"
          aria-label="Leitura do cenário"
        >
          <header className="flex items-start gap-2 border-b border-border px-4 py-3">
            <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-warn/15">
              <Sparkles className="size-4 text-warn" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs tracking-wide text-muted uppercase">Leitura do cenário</p>
              <p className="truncate text-sm font-medium text-fg">{narrative.headline}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md p-1 text-muted hover:bg-bg hover:text-fg"
              aria-label="Fechar"
            >
              <X className="size-4" />
            </button>
          </header>

          <div className="flex flex-wrap gap-1.5 border-b border-border px-4 py-2">
            {ASSISTANT_QUESTIONS.map((q) => (
              <button
                key={q.id}
                type="button"
                onClick={() => setQaId(q.id)}
                className={cn(
                  "h-7 rounded-full px-2.5 text-[11px] font-medium",
                  qaId === q.id
                    ? "bg-accent text-accent-fg"
                    : "bg-bg text-muted hover:text-fg",
                )}
              >
                {q.label}
              </button>
            ))}
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {qaAnswer ? (
              <p className="rounded-lg bg-bg/60 px-3 py-2 text-sm leading-relaxed text-fg ring-1 ring-border">
                {qaAnswer}
              </p>
            ) : (
              <p className="text-[11px] leading-relaxed text-subtle">
                Texto montado a partir dos números desta análise. Use os atalhos acima para
                caminho, amostra ou liquidez — sem chat livre.
              </p>
            )}
            {narrative.paragraphs.map((p, i) => (
              <p key={i} className="text-sm leading-relaxed text-fg">
                {p}
              </p>
            ))}
            <p className="border-t border-border pt-3 text-[11px] leading-relaxed text-subtle">
              {narrative.footer}
            </p>
          </div>
        </section>
      ) : null}

      {!open && hint ? (
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setHint(false);
          }}
          className={cn(
            "max-w-[220px] rounded-xl px-3 py-2 text-left text-xs leading-snug shadow-[var(--shadow-border)]",
            weak ? "bg-warn/15 text-fg ring-1 ring-warn/40" : "bg-surface text-muted",
          )}
        >
          {weak
            ? "Amostra frágil — toque para ler o cenário e o aviso de cautela."
            : "Toque para ler o cenário: o que os números dizem, em português."}
        </button>
      ) : null}

      <Button
        type="button"
        size="lg"
        onClick={() => {
          setOpen((v) => !v);
          setHint(false);
        }}
        className={cn(
          "h-12 gap-2 rounded-full px-4 shadow-lg",
          open && "bg-surface text-fg shadow-[var(--shadow-border)]",
          !open && weak && "ring-2 ring-warn/50",
        )}
        variant={open ? "secondary" : "default"}
        aria-expanded={open}
      >
        <MessageCircle className="size-4" />
        {open ? "Fechar" : "Ler o cenário"}
      </Button>
    </div>
  );
}

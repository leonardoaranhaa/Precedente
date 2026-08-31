import { useMemo, useState } from "react";
import { MessageCircle, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { narrateScenario } from "@/lib/market/narrate";
import type { StoredAnalysis } from "@/lib/market/types";
import { cn } from "@/lib/utils";

type Props = {
  analysis: StoredAnalysis | null;
  className?: string;
};

/**
 * Assistente flutuante: ao acionar, narra o cenário à frente com padrões históricos.
 * Sem recomendação de exposição — só o que costumava acontecer em condições parecidas.
 */
export function ScenarioAssistant({ analysis, className }: Props) {
  const [open, setOpen] = useState(false);
  const narrative = useMemo(
    () => (analysis ? narrateScenario(analysis) : null),
    [analysis],
  );

  if (!analysis || !narrative) return null;

  return (
    <div
      className={cn(
        "fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] z-40 flex flex-col items-end gap-3",
        className,
      )}
    >
      {open ? (
        <section
          className="flex max-h-[min(70vh,520px)] w-[min(100vw-2rem,380px)] flex-col overflow-hidden rounded-2xl bg-surface shadow-[var(--shadow-border)] ring-1 ring-border"
          role="dialog"
          aria-label="Assistente de cenário"
        >
          <header className="flex items-start gap-2 border-b border-border px-4 py-3">
            <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-warn/15">
              <Sparkles className="size-4 text-warn" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs tracking-wide text-muted uppercase">Assistente de cenário</p>
              <p className="truncate text-sm font-medium text-fg">{narrative.headline}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md p-1 text-muted hover:bg-bg hover:text-fg"
              aria-label="Fechar assistente"
            >
              <X className="size-4" />
            </button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            <p className="text-[11px] leading-relaxed text-subtle">
              Leitura descritiva do que está na tela e do que o histórico parecido costumava fazer.
              Não orienta exposição.
            </p>
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

      <Button
        type="button"
        size="lg"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "h-12 gap-2 rounded-full px-4 shadow-lg",
          open && "bg-surface text-fg shadow-[var(--shadow-border)]",
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

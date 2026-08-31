import { BarChart3, Database, Eye } from "lucide-react";

const STEPS = [
  {
    icon: Eye,
    title: "Leitura do print",
    body: "O modelo descreve tendência e padrão visíveis. É apoio qualitativo — não é a conta.",
  },
  {
    icon: Database,
    title: "OHLC real",
    body: "O histórico do par vem da Binance: candles, RSI, médias, topos e fundos.",
  },
  {
    icon: BarChart3,
    title: "O que veio depois",
    body: "Quantas vezes essa condição já ocorreu, e a distribuição do movimento seguinte. Frequência, nunca ordem.",
  },
] as const;

export function HowItWorks() {
  return (
    <section className="space-y-4">
      <h2 className="text-xs tracking-wide text-muted uppercase">Como funciona</h2>
      <ol className="space-y-3">
        {STEPS.map((s) => (
          <li
            key={s.title}
            className="flex gap-3 rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]"
          >
            <s.icon className="mt-0.5 size-4 shrink-0 text-accent" />
            <div>
              <p className="text-sm font-medium text-fg">{s.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

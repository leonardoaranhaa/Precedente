import { useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { getRiskLog, type RiskLog } from "@/lib/risk-log";
import { cn } from "@/lib/utils";

type Props = { className?: string };

/**
 * Prova de valor sem prometer lucro: quantas vezes um aviso de risco real
 * (amostra fraca ou drawdown de caminho) apareceu numa análise que o
 * usuário abriu. Some sozinho enquanto o contador estiver zerado — não
 * inventa prova de valor pra quem ainda não viu nenhum aviso.
 */
export function RiskLogPanel({ className }: Props) {
  const [log, setLog] = useState<RiskLog | null>(null);

  useEffect(() => {
    setLog(getRiskLog());
  }, []);

  if (!log) return null;
  const total = log.sampleWeak + log.drawdownHigh;
  if (total === 0) return null;

  const parts: string[] = [];
  if (log.sampleWeak > 0) parts.push(`${log.sampleWeak} de amostra fraca`);
  if (log.drawdownHigh > 0) parts.push(`${log.drawdownHigh} de drawdown de caminho elevado`);

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-surface px-4 py-3 shadow-[var(--shadow-border)]",
        className,
      )}
    >
      <p className="flex items-center gap-1.5 text-[10px] tracking-wide text-muted uppercase">
        <ShieldAlert className="size-3" />
        Riscos sinalizados
      </p>
      <p className="mt-1.5 text-sm text-fg">
        <span className="font-mono font-semibold tabular-nums">{total}</span>{" "}
        aviso{total === 1 ? "" : "s"} de risco — {parts.join(" e ")}.
      </p>
      <p className="mt-1 text-[11px] text-subtle">
        Não é lucro gerado — é risco que apareceu na tela antes da sua decisão.
      </p>
    </div>
  );
}

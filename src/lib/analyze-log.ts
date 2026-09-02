import { getSql } from "@/lib/db";

export type AnalysisLogEntry = {
  ticker: string;
  timeframe: string;
  hasImage: boolean;
  durationMs: number;
  matches: number;
  sampleNote: string;
  relaxed: boolean;
  source: string;
  visionCostUsd: number;
};

/**
 * Observabilidade mínima: uma linha estruturada por análise (stdout, capturado
 * pelo log da Railway independente do banco) + uma linha em `analysis_log`
 * (Postgres) pra dar pra agregar sem abrir código — ver /api/ops/analysis.
 * Nunca deve derrubar a análise: falha de log é só um console.error.
 */
export function logAnalysis(entry: AnalysisLogEntry): void {
  console.log(JSON.stringify({ type: "analysis", ...entry, at: new Date().toISOString() }));

  void persist(entry).catch((err: unknown) => {
    console.error("[analysis_log] falha ao persistir:", err instanceof Error ? err.message : err);
  });
}

async function persist(entry: AnalysisLogEntry): Promise<void> {
  const sql = await getSql();
  await sql.query(
    `insert into analysis_log
       (ticker, timeframe, has_image, duration_ms, matches, sample_note, relaxed, source, vision_cost_usd)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      entry.ticker,
      entry.timeframe,
      entry.hasImage,
      entry.durationMs,
      entry.matches,
      entry.sampleNote,
      entry.relaxed,
      entry.source,
      entry.visionCostUsd,
    ],
  );
}

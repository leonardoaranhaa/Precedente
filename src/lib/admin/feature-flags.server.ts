/**
 * Feature flags administráveis (server-only) — Postgres/PGLite via getSql(),
 * mesmo padrão de user_entitlements. Chave conhecida hoje:
 * "billing_gates_enabled" (espelha BILLING_GATES_ENABLED, mas editável sem
 * redeploy). Uma linha ausente cai no fallback informado pelo chamador —
 * nunca lança, o painel deve funcionar mesmo com a tabela vazia.
 */
import { getSql } from "../db";

export type FeatureFlag = { key: string; enabled: boolean; updatedAt: string; updatedBy: string | null };

type Row = { key: string; enabled: boolean; updated_at: string; updated_by: string | null };

function fromRow(r: Row): FeatureFlag {
  return { key: r.key, enabled: r.enabled, updatedAt: r.updated_at, updatedBy: r.updated_by };
}

export async function listFeatureFlags(): Promise<FeatureFlag[]> {
  const sql = await getSql();
  const rows = await sql.query<Row>("select * from admin_feature_flags order by key");
  return rows.map(fromRow);
}

/** Valor booleano de uma flag, ou `fallback` se a linha não existir (tabela vazia, chave nova). */
export async function getFeatureFlagBool(key: string, fallback: boolean): Promise<boolean> {
  const sql = await getSql();
  const rows = await sql.query<{ enabled: boolean }>(
    "select enabled from admin_feature_flags where key = $1",
    [key],
  );
  return rows[0] ? rows[0].enabled : fallback;
}

export async function setFeatureFlag(
  key: string,
  enabled: boolean,
  updatedByEmail: string,
): Promise<FeatureFlag> {
  const sql = await getSql();
  const rows = await sql.query<Row>(
    `insert into admin_feature_flags (key, enabled, updated_at, updated_by)
     values ($1, $2, now(), $3)
     on conflict (key) do update set
       enabled = excluded.enabled,
       updated_at = excluded.updated_at,
       updated_by = excluded.updated_by
     returning *`,
    [key, enabled, updatedByEmail],
  );
  return fromRow(rows[0]!);
}

/**
 * billingGatesEnabled(), mas com override do painel admin — se a flag
 * "billing_gates_enabled" tiver uma linha na tabela, ela manda; senão cai
 * pra BILLING_GATES_ENABLED (env var), o comportamento de sempre.
 */
export async function resolveBillingGatesEnabled(): Promise<boolean> {
  const { billingGatesEnabled } = await import("../billing/plan-limits");
  return getFeatureFlagBool("billing_gates_enabled", billingGatesEnabled());
}

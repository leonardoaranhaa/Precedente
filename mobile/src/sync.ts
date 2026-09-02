import { API_BASE_URL } from "./config";
import { currentAuthHeader } from "./auth";

export type SyncKind = "watch" | "history";

/** Lê o blob sincronizado do usuário (ou null se nunca sincronizou esse tipo, ou sem sessão). */
export async function getSyncData(kind: SyncKind): Promise<unknown> {
  const auth = await currentAuthHeader();
  if (!auth.Authorization) return null;
  try {
    const res = await fetch(`${API_BASE_URL}/api/sync?kind=${kind}`, { headers: auth });
    if (!res.ok) return null;
    const body = (await res.json()) as { data?: unknown };
    return body.data ?? null;
  } catch {
    return null;
  }
}

/** Substitui o blob sincronizado do usuário por inteiro — silencioso: sync é conveniência, não bloqueia o app. */
export async function setSyncData(kind: SyncKind, data: unknown): Promise<void> {
  const auth = await currentAuthHeader();
  if (!auth.Authorization) return;
  try {
    await fetch(`${API_BASE_URL}/api/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...auth },
      body: JSON.stringify({ kind, data }),
    });
  } catch {
    /* melhor esforço */
  }
}

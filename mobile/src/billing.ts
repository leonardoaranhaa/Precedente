import { API_BASE_URL } from "./config";
import { currentAuthHeader } from "./auth";

export type BillingStatus = { active: boolean };

export async function getBillingStatus(): Promise<BillingStatus> {
  const auth = await currentAuthHeader();
  if (!auth.Authorization) return { active: false };
  try {
    const res = await fetch(`${API_BASE_URL}/api/billing/status`, { headers: auth });
    if (!res.ok) return { active: false };
    const body = (await res.json()) as { active?: boolean };
    return { active: Boolean(body.active) };
  } catch {
    return { active: false };
  }
}

async function billingUrl(path: "checkout" | "portal"): Promise<{ url: string } | { error: string }> {
  const auth = await currentAuthHeader();
  if (!auth.Authorization) return { error: "Entre na sua conta primeiro." };
  try {
    const res = await fetch(`${API_BASE_URL}/api/billing/${path}`, {
      method: "POST",
      headers: auth,
    });
    const body = (await res.json().catch(() => null)) as { url?: string; error?: string } | null;
    if (!res.ok || !body?.url) {
      return { error: body?.error ?? "Não deu pra continuar agora." };
    }
    return { url: body.url };
  } catch {
    return { error: "Falha de rede. Tente de novo em instantes." };
  }
}

/** URL do Stripe Checkout — abrir com `Linking.openURL` (navegador do sistema). */
export function startPremiumCheckout(): Promise<{ url: string } | { error: string }> {
  return billingUrl("checkout");
}

/** URL do portal de cobrança do Stripe — abrir com `Linking.openURL`. */
export function openBillingPortal(): Promise<{ url: string } | { error: string }> {
  return billingUrl("portal");
}

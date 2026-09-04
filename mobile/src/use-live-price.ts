import { useEffect, useRef, useState } from "react";
import { API_BASE_URL } from "./config";

const POLL_MS = 6_000;

/**
 * Preço "vivo" pro cabeçalho do resultado — poll leve enquanto a tela
 * estiver montada. Nunca bloqueia nem substitui o preço da análise: se o
 * fetch falhar (rede, símbolo, Binance fora do ar), simplesmente não
 * atualiza — quem chama sempre tem o preço da análise como fallback.
 */
export function useLivePrice(symbol: string | undefined, enabled: boolean): number | null {
  const [price, setPrice] = useState<number | null>(null);
  const symbolRef = useRef(symbol);
  symbolRef.current = symbol;

  useEffect(() => {
    setPrice(null);
    if (!enabled || !symbol) return;

    let alive = true;

    async function tick() {
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/price?symbol=${encodeURIComponent(symbolRef.current ?? "")}`,
        );
        if (!res.ok || !alive) return;
        const body = (await res.json()) as { price?: number };
        if (alive && typeof body.price === "number" && Number.isFinite(body.price)) {
          setPrice(body.price);
        }
      } catch {
        /* silencioso — mantém o último preço vivo conhecido (ou nenhum) */
      }
    }

    void tick();
    const id = setInterval(() => void tick(), POLL_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [symbol, enabled]);

  return price;
}

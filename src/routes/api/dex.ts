import { createFileRoute } from "@tanstack/react-router";
import { assessDexFragility } from "@/lib/market/dex-fragility";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

/**
 * Leitura de fragilidade de um token que vive no DEX (ciclo curto, tipo
 * Moonshot). Rota separada de /api/analyze de propósito: aqui NÃO há
 * precedente — o par não tem histórico de candles pra isso. O que se entrega
 * é o estado de liquidez e fluxo agora.
 *
 * ATENÇÃO ao import de `@/lib/market/onchain`: ele é dinâmico aqui e nos
 * outros dois pontos do projeto (analyze.ts e push/funding-digest-scan.ts).
 * Misturar estático e dinâmico no mesmo módulo através da fronteira
 * client/server corrompe o chunk do Rolldown e derruba o servidor compilado
 * com "Export 'ssr_exports' is not defined in module" — invisível pro tsc,
 * pro eslint e pro `vite build`. Já aconteceu duas vezes em produção.
 */

const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 5 * 60 * 1000;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(body: unknown, status = 200, cache = "no-store"): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": cache, ...CORS_HEADERS },
  });
}

export const Route = createFileRoute("/api/dex")({
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { status: 204, headers: CORS_HEADERS }),
      GET: async ({ request }) => {
        const limit_ = checkRateLimit(`dex:${clientIp(request)}`, RATE_LIMIT, RATE_WINDOW_MS);
        if (!limit_.allowed) {
          return json({ error: "Muitas tentativas. Tente de novo em instantes." }, 429);
        }

        const raw = new URL(request.url).searchParams.get("ticker");
        const ticker = (raw ?? "").trim().toUpperCase();
        if (!/^[A-Z0-9]{2,20}$/.test(ticker)) {
          return json({ error: "Informe um ticker válido (2 a 20 letras ou números)." }, 400);
        }

        try {
          const { fetchOnchainContext } = await import("@/lib/market/onchain");
          const onchain = await fetchOnchainContext(ticker);

          if (onchain.dexSource === null && onchain.liquidityUsd === null) {
            return json(
              {
                error: `Nenhum par de ${ticker} encontrado no DEX. Sem par, não há liquidez nem fluxo pra ler.`,
              },
              404,
            );
          }

          return json({
            ticker,
            onchain,
            fragility: assessDexFragility(onchain),
            // Cache curto: liquidez e fluxo de par novo mudam por minuto.
          }, 200, "public, max-age=30");
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Não foi possível ler o DEX agora.";
          return json({ error: message }, 502);
        }
      },
    },
  },
});

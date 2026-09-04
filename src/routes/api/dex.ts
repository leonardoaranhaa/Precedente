import { createFileRoute } from "@tanstack/react-router";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

/**
 * CAMADA 3 — GET /api/dex?ticker=X
 *
 * Leitura de fragilidade de um token que vive no DEX (ciclo curto, tipo
 * Moonshot). Rota separada de /api/analyze de propósito: aqui NÃO há
 * precedente — o par não tem histórico de candles pra isso. O que se entrega
 * é o estado de liquidez e fluxo agora.
 *
 * ATENÇÃO ao import de `@/lib/market/dex`: é DINÂMICO, e a fachada é o único
 * caminho pra dentro de dex/. Nada aqui pode importar dex/fetch, dex/types ou
 * dex/fragility estaticamente — um módulo alcançado de forma estática num
 * lugar e dinâmica em outro, cruzando a fronteira client/server, corrompe o
 * chunk do Rolldown e derruba o servidor compilado com "Export 'ssr_exports'
 * is not defined in module". É invisível pro tsc, pro eslint e pro
 * `vite build`; só aparece rodando o binário. Já aconteceu duas vezes em
 * produção. Ver docs/dex-arquitetura.md.
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
          const { readDexPair } = await import("@/lib/market/dex");
          const reading = await readDexPair(ticker);

          if (!reading) {
            return json(
              {
                error: `Nenhum par de ${ticker} encontrado no DEX. Sem par, não há liquidez nem fluxo pra ler.`,
              },
              404,
            );
          }

          // Cache curto: liquidez e fluxo de par novo mudam por minuto.
          return json({ ticker, ...reading }, 200, "public, max-age=30");
        } catch (err) {
          const message = err instanceof Error ? err.message : "Não foi possível ler o DEX agora.";
          return json({ error: message }, 502);
        }
      },
    },
  },
});

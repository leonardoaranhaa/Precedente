import { test, expect } from "@playwright/test";

/**
 * Smoke com ANTHROPIC_API_KEY real — roda só no workflow nightly
 * (vision-smoke.yml), nunca no CI normal de PR (lá a chave não está
 * setada e print-vision.spec.ts tolera o caminho de erro de propósito).
 * Aqui a leitura DEVE funcionar: um visionError com a chave real presente
 * é regressão de verdade (prompt mudou, formato de resposta mudou, chave
 * expirou, modelo mudou) — não um "melhor esforço" tolerável.
 */

const TINY_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

const COACHING_RE =
  /\b(compre|venda|compre já|venda já|entrar agora|sair agora|ordem de compra|ordem de venda|sinal de compra|sinal de venda)\b/i;

test.describe("Vision smoke (chave real)", () => {
  test.skip(
    !process.env.ANTHROPIC_API_KEY,
    "Sem ANTHROPIC_API_KEY neste ambiente — só faz sentido no workflow nightly.",
  );

  test("leitura visual real funciona de ponta a ponta, sem tolerar erro", async ({
    request,
  }) => {
    test.setTimeout(60_000);

    const res = await request.post("/api/analyze", {
      data: {
        ticker: "BTC",
        timeframe: "4h",
        imageDataUrl: `data:image/png;base64,${TINY_PNG_BASE64}`,
      },
      headers: { "Content-Type": "application/json" },
    });

    expect(res.ok(), await res.text()).toBeTruthy();
    const body = await res.json();

    expect(body.visionError, `visionError inesperado: ${body.visionError}`).toBeFalsy();
    expect(body.vision, "sem body.vision mesmo com ANTHROPIC_API_KEY setada").toBeTruthy();
    expect(typeof body.vision.leitura).toBe("string");
    expect(body.vision.leitura.length).toBeGreaterThan(0);
    expect(["alta", "baixa", "lateral", "indefinida"]).toContain(body.vision.tendencia);
    expect(["alta", "media", "baixa"]).toContain(body.vision.confianca);
    expect(body.vision.leitura).not.toMatch(COACHING_RE);
  });
});

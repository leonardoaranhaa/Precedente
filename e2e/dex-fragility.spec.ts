import { test, expect } from "@playwright/test";

/**
 * Fluxo: token sem histórico na Binance não termina em beco sem saída — a
 * leitura de fragilidade do DEX entra no lugar.
 *
 * A resposta de /api/dex é fixada de propósito. Tokens de ciclo curto morrem
 * em horas (o BABYAI usado na validação foi de US$ 888K de volume pra US$ 54
 * no mesmo dia), então um teste que dependesse de dado vivo seria instável por
 * construção. A rota contra a API real já é verificada por curl; aqui o que se
 * testa é o fluxo e a renderização.
 */
const FIXTURE = {
  ticker: "ZZTESTZZ",
  pair: {
    chainId: "solana",
    dexId: "raydium",
    labels: ["v4"],
    pairAddress: "0xabc",
    pairUrl: "https://dexscreener.com/solana/abc",
    tokenSymbol: "ZZTESTZZ",
    tokenName: "Token de Teste",
    tokenAddress: "0xdef",
    quoteSymbol: "SOL",
    imageUrl: null,
    headerUrl: null,
    websites: [],
    socials: [],
    boostsActive: null,
    priceUsd: 0.00042,
    liquidityUsd: 8_000,
    marketCapUsd: 4_000_000,
    fdvUsd: 4_000_000,
    pairAgeHours: 30,
    m5: { buys: 2, sells: 9, volumeUsd: 900, priceChangePct: -6.2 },
    h1: { buys: 40, sells: 90, volumeUsd: 12_000, priceChangePct: -18 },
    h6: { buys: 300, sells: 700, volumeUsd: 180_000, priceChangePct: -34 },
    h24: { buys: 200, sells: 600, volumeUsd: 400_000, priceChangePct: -55 },
    fetchedAt: Date.now(),
    source: "DexScreener",
  },
  fragility: {
    level: "extrema",
    flags: [
      {
        id: "par_novo",
        label: "Par novíssimo",
        detail: "Par criado há ~30h. Sem histórico para qualquer leitura de precedente.",
        severity: "alta",
      },
      {
        id: "liquidez_baixa",
        label: "Liquidez mínima",
        detail: "Pool com US$ 8K. Uma única saída de tamanho move o preço inteiro.",
        severity: "alta",
      },
      {
        id: "saida_estreita",
        label: "Saída mínima",
        detail: "Pool de US$ 8K sustentando US$ 4,0M: só 0,2% do valor de papel cabe na liquidez.",
        severity: "alta",
      },
    ],
    metrics: {
      liquidityUsd: 8_000,
      volume24hUsd: 400_000,
      turnover24h: 50,
      sellRatio24h: 0.75,
      sellRatio6h: 0.7,
      volumeTrend: 0.4,
      pairAgeHours: 30,
      marketCapUsd: 4_000_000,
      liqToMcap: 0.002,
    },
    disclaimer:
      "Não é estatística de caminho: o par não tem histórico de candles para precedentes. São fatos de liquidez e fluxo do DEX agora — nunca ordem de compra ou venda.",
  },
};

test("token fora da Binance cai na leitura de fragilidade do DEX", async ({ page }) => {
  await page.route("**/api/dex**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(FIXTURE) }),
  );

  await page.goto("/");
  await page.waitForLoadState("networkidle");

  await page.locator("form").getByPlaceholder("BTC, ETHUSDT, SOL…").fill("ZZTESTZZ");
  await page.locator("form").getByRole("button", { name: "Analisar", exact: true }).click();

  // O painel só aparece depois do erro de "não listado" — é o gatilho.
  const panel = page.getByText("Fragilidade extrema");
  await expect(panel).toBeVisible({ timeout: 30_000 });

  // Identidade do par e o número que mais importa: quanto do valor sai.
  await expect(page.getByText("Token de Teste · solana · raydium · v4")).toBeVisible();
  await expect(page.getByText("Saída", { exact: true })).toBeVisible();
  await expect(page.getByText("0,20%")).toBeVisible();

  // Os três sinais, com o texto factual.
  await expect(page.getByText("Par novíssimo")).toBeVisible();
  await expect(page.getByText(/só 0,2% do valor de papel cabe na liquidez/)).toBeVisible();

  // Disclaimer sempre presente — é o que separa isto de precedente.
  await expect(page.getByText(/não é estatística de caminho/i)).toBeVisible();
});

test("abas de janela trocam o fluxo mostrado", async ({ page }) => {
  await page.route("**/api/dex**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(FIXTURE) }),
  );

  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.locator("form").getByPlaceholder("BTC, ETHUSDT, SOL…").fill("ZZTESTZZ");
  await page.locator("form").getByRole("button", { name: "Analisar", exact: true }).click();
  await expect(page.getByText("Fragilidade extrema")).toBeVisible({ timeout: 30_000 });

  // Padrão é 24H: 200 compras / 600 vendas.
  await expect(page.getByText("200 compras")).toBeVisible();
  await expect(page.getByText("-55,00%")).toBeVisible();

  await page.getByRole("tab", { name: "5M" }).click();
  await expect(page.getByText("2 compras")).toBeVisible();
  await expect(page.getByText("9 vendas")).toBeVisible();
  await expect(page.getByText("-6,20%")).toBeVisible();
});

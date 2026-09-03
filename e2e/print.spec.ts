import { test, expect } from "@playwright/test";

/**
 * PNG 1×1 mínimo — suficiente para o pipeline de print (data URL → API).
 * Não é um gráfico real; a leitura visual pode falhar ou devolver confiança
 * baixa — o produto de qualidade exige que o motor OHLC continue íntegro.
 */
const TINY_PNG_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
const TINY_PNG_DATA_URL = `data:image/png;base64,${TINY_PNG_B64}`;
const TINY_PNG_BUFFER = Buffer.from(TINY_PNG_B64, "base64");

test.describe("leitura de print (visão) + qualidade do produto", () => {
  test("API: analyze com print devolve OHLC/precedentes utilizáveis", async ({ request }) => {
    const res = await request.post("/api/analyze", {
      data: {
        ticker: "BTC",
        timeframe: "1h",
        imageDataUrl: TINY_PNG_DATA_URL,
      },
      timeout: 60_000,
    });

    // Rate limit / falha de rede externa não devem passar como “produto ok”.
    expect(res.status(), await res.text()).toBeLessThan(500);

    if (res.status() === 429) {
      test.skip(true, "Rate limit — ambiente saturado; reexecute a suíte.");
      return;
    }

    // 403 de gate só com BILLING_GATES_ENABLED — default off em CI.
    if (res.status() === 403) {
      const body = await res.json();
      expect(body).toHaveProperty("feature");
      return;
    }

    expect(res.ok()).toBeTruthy();
    const body = await res.json();

    // Núcleo do produto — sem isso o print é inútil.
    expect(body.ticker).toMatch(/BTC/);
    expect(body.snapshot).toBeTruthy();
    expect(body.snapshot.rsi14).toEqual(expect.any(Number));
    expect(body.precedent).toBeTruthy();
    expect(body.precedent.fingerprint).toBeTruthy();
    expect(Array.isArray(body.precedent.horizons)).toBeTruthy();
    expect(body.precedent.horizons.length).toBeGreaterThanOrEqual(1);
    expect(body.candleCount).toBeGreaterThan(50);

    // Visão: sucesso (objeto) OU falha explícita (string) — nunca silêncio total
    // se o cliente enviou print. (Ambiente sem ANTHROPIC_API_KEY → visionError.)
    const hasVision = body.vision != null && typeof body.vision.leitura === "string";
    const hasVisionError =
      typeof body.visionError === "string" && body.visionError.length > 0;
    expect(hasVision || hasVisionError).toBeTruthy();

    if (hasVision) {
      expect(["alta", "baixa", "lateral", "indefinida"]).toContain(body.vision.tendencia);
      expect(["alta", "media", "baixa"]).toContain(body.vision.confianca);
      // Anti-sinal: a leitura não deve instruir ordem (heurística leve).
      const lower = String(body.vision.leitura).toLowerCase();
      expect(lower).not.toMatch(/\bcompre agora\b|\bvenda agora\b|\bentreda recomendada\b/);
    }
  });

  test("API: analyze sem print não inventa visão", async ({ request }) => {
    const res = await request.post("/api/analyze", {
      data: {
        ticker: "BTC",
        timeframe: "4h",
        imageDataUrl: null,
      },
      timeout: 45_000,
    });

    if (res.status() === 429) {
      test.skip(true, "Rate limit — ambiente saturado.");
      return;
    }

    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.precedent?.fingerprint).toBeTruthy();
    expect(body.vision).toBeNull();
  });

  test("UI: upload de print + Analisar mantém Fingerprint (OHLC)", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await expect(page.getByTestId("upload-zone")).toBeVisible();

    await page.getByTestId("print-file-input").setInputFiles({
      name: "chart-fixture.png",
      mimeType: "image/png",
      buffer: TINY_PNG_BUFFER,
    });

    await expect(page.getByTestId("print-preview")).toBeVisible({
      timeout: 10_000,
    });

    await page.getByRole("textbox", { name: "Par" }).fill("BTC");
    await page.locator("form").getByRole("button", { name: "Analisar", exact: true }).click();

    // Motor real — o print não pode derrubar a análise estatística.
    await expect(page.getByRole("heading", { name: "Fingerprint" })).toBeVisible({
      timeout: 45_000,
    });

    // Seção de leitura visual (sucesso ou mensagem de indisponibilidade).
    await expect(page.getByTestId("vision-section")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByTestId("vision-section")).toContainText(/Leitura visual/i);
  });

  test("UI: copy do upload menciona cota e não vende sinal", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const zone = page.getByTestId("upload-zone");
    await expect(zone).toContainText(/leitura visual/i);
    await expect(zone).toContainText(/nunca é ordem/i);
  });
});

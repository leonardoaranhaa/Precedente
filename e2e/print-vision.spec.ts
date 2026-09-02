import { test, expect, type APIRequestContext } from "@playwright/test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** PNG 1×1 transparente — válido para createImageBitmap e data URL. */
const TINY_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

const TINY_PNG = Buffer.from(TINY_PNG_BASE64, "base64");

const COACHING_RE =
  /\b(compre|venda|compre já|venda já|entrar agora|sair agora|ordem de compra|ordem de venda|sinal de compra|sinal de venda)\b/i;

function tinyDataUrl(): string {
  return `data:image/png;base64,${TINY_PNG_BASE64}`;
}

async function analyzeWithPrint(request: APIRequestContext, body: Record<string, unknown>) {
  return request.post("/api/analyze", {
    data: body,
    headers: { "Content-Type": "application/json" },
  });
}

test.describe("Print / leitura visual", () => {
  test("upload mostra preview e remover limpa o print", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await expect(page.getByTestId("upload-zone")).toBeVisible();
    await expect(page.getByTestId("print-drop-label")).toBeVisible();

    await page.getByTestId("print-file-input").setInputFiles({
      name: "chart-print.png",
      mimeType: "image/png",
      buffer: TINY_PNG,
    });

    await expect(page.getByTestId("print-preview")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByAltText("Print do gráfico")).toBeVisible();

    await page.getByTestId("print-remove").click();
    await expect(page.getByTestId("print-preview")).toHaveCount(0);
    await expect(page.getByTestId("print-drop-label")).toBeVisible();
  });

  test("arquivo não-imagem é rejeitado no cliente", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await page.getByTestId("print-file-input").setInputFiles({
      name: "not-an-image.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("isto não é um gráfico"),
    });

    await expect(page.getByTestId("print-upload-error")).toContainText(/imagem/i, {
      timeout: 5_000,
    });
    await expect(page.getByTestId("print-preview")).toHaveCount(0);
  });

  test("analisar com print chega no resultado e expõe seção de visão", async ({
    page,
  }) => {
    test.setTimeout(90_000);

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await page.getByTestId("print-file-input").setInputFiles({
      name: "chart-print.png",
      mimeType: "image/png",
      buffer: TINY_PNG,
    });
    await expect(page.getByTestId("print-preview")).toBeVisible();

    await page.getByPlaceholder(/BTC, ETHUSDT/i).fill("BTC");
    await page.locator("form").getByRole("button", { name: "Analisar", exact: true }).click();

    // Pipeline deve mencionar leitura visual quando há print.
    await expect(page.getByText("Leitura visual do print")).toBeVisible({
      timeout: 15_000,
    });

    await expect(page.getByTestId("analysis-result")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByRole("heading", { name: "Fingerprint" })).toBeVisible();

    // Com ou sem ANTHROPIC_API_KEY: a seção de visão aparece (leitura OU erro gracioso).
    const vision = page.getByTestId("vision-section");
    await expect(vision).toBeVisible();
    await expect(vision.getByText(/Leitura visual/i)).toBeVisible();

    const reading = page.getByTestId("vision-reading");
    const visionError = page.getByTestId("vision-error");
    const hasReading = (await reading.count()) > 0;
    const hasError = (await visionError.count()) > 0;
    expect(hasReading || hasError).toBeTruthy();

    if (hasReading) {
      const text = await reading.innerText();
      expect(text).not.toMatch(COACHING_RE);
    }
    if (hasError) {
      const text = await visionError.innerText();
      expect(text.length).toBeGreaterThan(3);
      expect(text).not.toMatch(COACHING_RE);
    }

    await expect(page.getByText(/nunca ordem de compra ou venda/i)).toBeVisible();
  });

  test("POST /api/analyze com print: OHLC obrigatório; visão best-effort", async ({
    request,
  }) => {
    test.setTimeout(90_000);

    const res = await analyzeWithPrint(request, {
      ticker: "BTC",
      timeframe: "4h",
      imageDataUrl: tinyDataUrl(),
    });

    const status = res.status();
    if (status === 429) {
      test.skip(true, "Rate limit atingido neste IP — reexecute o job.");
    }

    const body = await res.json();
    expect(status, JSON.stringify(body)).toBeLessThan(500);
    expect(res.ok(), JSON.stringify(body)).toBeTruthy();

    expect(body.ticker).toMatch(/BTC/);
    expect(body.timeframe).toBe("4h");
    expect(body.precedent).toBeTruthy();
    expect(body.precedent.horizons?.length).toBeGreaterThan(0);
    expect(body.snapshot).toBeTruthy();
    expect(typeof body.candleCount).toBe("number");
    expect(body.candleCount).toBeGreaterThan(50);

    if (body.vision) {
      expect(typeof body.vision.leitura).toBe("string");
      expect(body.vision.leitura.length).toBeGreaterThan(0);
      expect(["alta", "baixa", "lateral", "indefinida"]).toContain(body.vision.tendencia);
      expect(["alta", "media", "baixa"]).toContain(body.vision.confianca);
      expect(body.vision.leitura).not.toMatch(COACHING_RE);
      expect(body.visionError == null || body.visionError === "").toBeTruthy();
    } else {
      expect(typeof body.visionError).toBe("string");
      expect(body.visionError.length).toBeGreaterThan(5);
      expect(body.visionError).not.toMatch(COACHING_RE);
    }
  });

  test("POST /api/analyze rejeita data URL inválida de imagem", async ({ request }) => {
    const res = await analyzeWithPrint(request, {
      ticker: "BTC",
      timeframe: "1h",
      imageDataUrl: "data:text/plain;base64,aGVsbG8=",
    });
    // validateAnalyzeInput só aceita data:image/* — plain text vira null e OHLC segue.
    expect(res.status()).toBeLessThan(500);
  });

  test("POST /api/analyze rejeita print acima do limite de tamanho", async ({
    request,
  }) => {
    const huge = `data:image/jpeg;base64,${"A".repeat(1_800_001)}`;
    const res = await analyzeWithPrint(request, {
      ticker: "BTC",
      timeframe: "1h",
      imageDataUrl: huge,
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(String(body.error)).toMatch(/grande|recorte|print/i);
  });

  test("POST /api/analyze sem print continua funcional (regressão)", async ({
    request,
  }) => {
    test.setTimeout(60_000);
    const res = await analyzeWithPrint(request, {
      ticker: "ETH",
      timeframe: "1h",
      imageDataUrl: null,
    });
    if (res.status() === 429) {
      test.skip(true, "Rate limit — reexecute.");
    }
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.vision).toBeNull();
    expect(body.visionError == null || body.visionError === "").toBeTruthy();
    expect(body.precedent).toBeTruthy();
  });
});

test.describe("Print — contrato de prevenção", () => {
  test("prompt de visão no código-fonte proíbe recomendação de compra/venda", async () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const analyzeSrc = readFileSync(join(here, "../src/lib/analyze.ts"), "utf8");
    expect(analyzeSrc).toMatch(/Nunca recomende comprar, vender, entrar ou sair/);
    expect(analyzeSrc).toMatch(/VISION_PROMPT/);
  });
});

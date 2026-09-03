import { test, expect } from "@playwright/test";

test("analisa um par e mostra o resultado com o motor real", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await expect(page.getByText("Quantas vezes isso já aconteceu?")).toBeVisible();

  // Existem dois campos de ticker na página (busca do topo, placeholder
  // "BTC, ETHUSDT…", e o formulário principal, "BTC, ETHUSDT, SOL…") —
  // getByPlaceholder faz substring match, então tem que escopar pro form
  // certo, senão acerta o campo do topo por engano.
  await page.locator("form").getByPlaceholder("BTC, ETHUSDT, SOL…").fill("BTC");
  await page.locator("form").getByRole("button", { name: "Analisar", exact: true }).click();

  // Chamada real à Binance (sem mock) — pode levar alguns segundos.
  await expect(page.getByRole("heading", { name: "Fingerprint" })).toBeVisible({
    timeout: 30_000,
  });
});

test("ticker inválido mostra erro em vez de travar a tela", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.locator("form").getByPlaceholder("BTC, ETHUSDT, SOL…").fill("!!!");
  await page.locator("form").getByRole("button", { name: "Analisar", exact: true }).click();
  await expect(page.getByText(/inválido/i)).toBeVisible({ timeout: 10_000 });
});

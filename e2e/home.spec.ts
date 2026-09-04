import { test, expect } from "@playwright/test";

test("analisa um par e mostra o resultado com o motor real", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await expect(page.getByText("Quantas vezes isso já aconteceu?")).toBeVisible();

  await page.getByPlaceholder("BTC, ETHUSDT…").fill("BTC");
  await page.locator("form").getByRole("button", { name: "Analisar", exact: true }).click();

  // Chamada real à Binance (sem mock) — pode levar alguns segundos.
  await expect(page.getByRole("heading", { name: "Fingerprint" })).toBeVisible({
    timeout: 30_000,
  });
});

test("ticker inválido mostra erro em vez de travar a tela", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.getByPlaceholder("BTC, ETHUSDT…").fill("!!!");
  await page.locator("form").getByRole("button", { name: "Analisar", exact: true }).click();
  await expect(page.getByText(/inválido/i)).toBeVisible({ timeout: 10_000 });
});

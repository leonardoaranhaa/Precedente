import { test, expect } from "@playwright/test";

test("modal de configurações: tema alterna de verdade e persiste no data-theme", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Configurações" }).click();

  await expect(page.getByRole("heading", { name: "Configurações" })).toBeVisible();

  await page.getByRole("button", { name: /Claro/ }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

  await page.getByRole("button", { name: /Escuro/ }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("aba Perfil pede login quando ninguém está logado", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Configurações" }).click();
  await page.getByRole("tab", { name: "Perfil" }).click();
  await expect(page.getByText("Entre na sua conta pra ver e editar seu perfil.")).toBeVisible();
});

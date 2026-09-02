import { test, expect } from "@playwright/test";

const PAGES = [
  { path: "/termos", title: "Termos de uso" },
  { path: "/privacidade", title: "Privacidade" },
  { path: "/aviso-de-risco", title: "Aviso de risco" },
];

for (const { path, title } of PAGES) {
  test(`${path} carrega e mostra o título e o rodapé de navegação legal`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: title, level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: "Termos de uso", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Privacidade", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Aviso de risco", exact: true })).toBeVisible();
  });
}

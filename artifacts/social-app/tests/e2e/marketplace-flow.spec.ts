import { test, expect } from "@playwright/test";

test.describe("Marketplace", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/sign-in", { waitUntil: "domcontentloaded" });
    const devBtn = page.getByRole("button", { name: /usuario/i }).first();
    if (await devBtn.isVisible().catch(() => false)) {
      await devBtn.click();
      await page.waitForURL(/\//, { timeout: 15_000 });
    }
  });

  test("carga marketplace, categorías y modal publicar", async ({ page }) => {
    await page.goto("/marketplace", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /marketplace/i })).toBeVisible();
    await expect(page.getByTestId("input-marketplace-search")).toBeVisible();
    await expect(page.getByTestId("filter-category-electronica")).toBeVisible();
    await expect(page.getByTestId("tab-my-listings")).toBeVisible();

    await page.getByTestId("button-create-listing").click();
    await expect(page.getByRole("heading", { name: /publicar anuncio/i })).toBeVisible();
    await expect(page.getByText(/categoría/i).first()).toBeVisible();
  });

  test("mis anuncios y publicar anuncio de prueba", async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto("/marketplace");
    await page.getByTestId("button-create-listing").click();
    await page.getByPlaceholder(/qué estás vendiendo/i).fill("Producto prueba E2E");
    await page.getByPlaceholder("150000").fill("99000");
    await page.getByRole("button", { name: /^publicar$/i }).click();
    await expect(page.getByRole("heading", { name: /publicar anuncio/i })).toBeHidden({ timeout: 10_000 });

    await page.getByTestId("tab-my-listings").click();
    await expect(page.getByText("Producto prueba E2E")).toBeVisible({ timeout: 10_000 });
  });
});

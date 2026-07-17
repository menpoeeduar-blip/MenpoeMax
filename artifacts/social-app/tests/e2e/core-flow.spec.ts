import { test, expect } from "@playwright/test";

/** Rutas públicas o de auth que deben responder sin error HTTP */
const PUBLIC_ROUTES = [
  "/sign-in",
  "/sign-up",
  "/settings",
  "/legal",
  "/birthdays",
  "/memories",
  "/help",
  "/wallet",
];

test("pantalla de login carga y muestra opciones", async ({ page }) => {
  await page.goto("/sign-in");
  await expect(page.getByRole("button", { name: /continuar con google/i })).toBeVisible();
  await expect(page.getByPlaceholder(/tu@email|correo/i)).toBeVisible();
  await expect(page.getByPlaceholder(/contraseña|contrasena|\••••/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /entrar/i })).toBeVisible();
});

test("rutas principales responden", async ({ page }) => {
  test.setTimeout(120_000);
  for (const route of PUBLIC_ROUTES) {
    const response = await page.goto(route, { waitUntil: "domcontentloaded", timeout: 20_000 });
    expect(response?.status()).toBeLessThan(400);
  }
});

test("acceso dev y cierre de sesión redirige a login", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/sign-in", { waitUntil: "domcontentloaded" });

  const devBtn = page.getByRole("button", { name: /usuario/i }).first();
  if (await devBtn.isVisible().catch(() => false)) {
    await devBtn.click();
    await page.waitForURL(/\//, { timeout: 15_000 });
    await expect(page).not.toHaveURL(/sign-in/);
  } else {
    test.skip();
    return;
  }

  await page.getByRole("button").filter({ has: page.locator("img") }).first().click();
  await page.getByText(/cerrar sesión/i).click();

  await page.waitForURL(/sign-in/, { timeout: 15_000 });
  await expect(page).toHaveURL(/sign-in/);
});

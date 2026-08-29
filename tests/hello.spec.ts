import { test, expect } from "@playwright/test";

test("auth proxy should respond without redirect loop", async ({ request }) => {
  const response = await request.get("http://localhost:3000/api/auth/csrf/");

  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("application/json");
  const body = await response.json();
  expect(body).toBeTruthy();
});

test("app page should load successfully", async ({ page }) => {
  await page.goto("http://localhost:3000");
  await expect(page.locator("body")).toBeVisible();
  await expect(
    page.getByRole("link", { name: /каталог|войти|профиль/i }),
  ).toBeVisible();
});

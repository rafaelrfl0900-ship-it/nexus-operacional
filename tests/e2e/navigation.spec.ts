import { expect, test } from "@playwright/test";

test("opens the Nexus command center", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Menu principal" })).toBeVisible();
  await page.locator("main").getByRole("link", { name: /Dashboard geral/ }).click();
  await expect(page.getByRole("heading", { name: "Dashboard geral" })).toBeVisible();
});

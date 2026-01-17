import { test, expect } from "@playwright/test";

test("marketing homepage loads", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("MoveAround TMS")).toBeVisible();
});

test("ronyx dashboard loads", async ({ page }) => {
  await page.goto("/ronyx");
  await expect(page.getByText("Dump Fleet Command Center")).toBeVisible();
});

test("ronyx tickets loads", async ({ page }) => {
  await page.goto("/ronyx/tickets");
  await expect(page.getByText("Tickets — Upload & Calculation Management")).toBeVisible();
});

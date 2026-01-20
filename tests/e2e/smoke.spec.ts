import { test, expect } from "@playwright/test";

test.describe.configure({ timeout: 60000 });

test("marketing homepage loads", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: /Stop Losing Time and Money on Manual Haul Tracking/i,
    }),
  ).toBeVisible();
});

test("ronyx dashboard loads", async ({ page }) => {
  await page.goto("/ronyx");
  await expect(
    page.getByRole("heading", { name: "Dump Fleet Command Center" }),
  ).toBeVisible();
});

test("ronyx tickets loads", async ({ page }) => {
  await page.goto("/ronyx/tickets");
  await expect(page.getByText("Tickets — Upload & Calculation Management")).toBeVisible();
});
